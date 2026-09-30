# ECL + DIL architecture

**Label:** `ALPHA_NON_PRODUCTION`  
**Boot lock:** `installer/scripts/start-sci-os.cjs`  
**Ports lock:** Control Plane `:3000` · Shell `apps/cockpit-ui` `:4000`  
**Rule:** compose-in-shell. No second OS, no second boot, no second workflow engine, no auto-trade.

## How it works

SCI OS ×10 remains one product with **ENTERPRISE_GRADE_ALPHA** identity (professional OS language — not a READY claim). ECL and DIL are libraries (`@scios/ecl-dil`) mounted on the existing Control Plane HTTP server and rendered as Professional views in the existing Cockpit.

Inspiration maps onto SCI modules. SCI is **not** an SAP, Palantir, Citadel, Google, Apple, or Bloomberg clone.

```
start-sci-os.cjs
  → Control Plane :3000
       /v1/ecl/*     Enterprise Control Layer (finance, risk, audit, reporting, guardrail)
       /v1/dil/*     Decision Intelligence (simulated Polymarket/Kalshi, probability, edge, risk, scenario)
       /v1/ai/proposals/*   AGENT → PROPOSAL → HUMAN → DECISION
  → Shell :4000
       Intelligence view  (Decision Intelligence Console)
       Reporting view     (ECL Reporting Console)
       System → Architecture overview
```

| Inspiration (learn-from) | SCI compose |
|--------------------------|-------------|
| sap.erp_core | `ecl.finance` + `ecl.risk` + `ecl.reporting` |
| palantir.cockpit | `cockpit.professional` + `cockpit.technical` |
| citadel.quant_core | `dil.probability` + `dil.edge` + `dil.risk` + `dil.scenario` |
| google.platform | Unified nav + command palette |
| apple.design | `packages/design-system` SCI tokens |
| bloomberg.data_ui | Intelligence + Reporting + Evidence panels |

### ECL — Enterprise Control Layer

SAP-like **spine**, not an ERP clone:

| Object | Role |
|--------|------|
| `Instrument` | Prediction-market contract identity (additive to data-fabric `InstrumentSchema`) |
| `Position` | Size, direction, MTM |
| `Trade` | Simulated fill (`simulated: true`) |
| `Bankroll` | Cash / margin / reserved / equity |
| `RiskBucket` | Max loss / exposure / leverage |
| `TradingSession` | Session PnL, max drawdown, volatility |

Engines: realized/unrealized PnL, drawdown, exposure, **capped** Kelly fraction, configurable guardrails.

### DIL — Decision Intelligence Layer

Polymarket / Kalshi **normalized** snapshots (today: in-memory `simulated_alpha`). Probability is a placeholder base-rate vs implied price. Edge = model − implied. Decision ∈ `{enter, trim, exit, avoid, wait}` with explanation factors. Horizon profiles: `5m` / `24h` / `72h`.

### AI agent

Registered NON-PRODUCTION models: `dil-probability-alpha`, `dil-edge-alpha`, `dil-risk-kelly-alpha`. The agent **cannot** open a position. `Proposal.autoExecute` is literal `false`. `requiresHuman` is literal `true`.

## Limitations

- Feeds are simulated by default. `SCI_DIL_FEED=live_unverified` is optional, UNVERIFIED, and does not calibrate live probability. Live venue APIs remain `live_unverified` only with that flag and evidence of a successful pull.
- Probability/edge models are **not live-calibrated**. Simulated closed-loop can reach `ADEQUATE_ALPHA`; live calibration remains **UNKNOWN**. No win-rate claim. No READY.
- In-memory book: process restart loses session state (not durable fabric).
- Kelly output is a **size cap recommendation**, not an order.

## Future work

- Optional live adapters with freshness + venue honesty labels.
- Durable ECL ledger (P2) without forking GW1.
- Long-horizon track-record store before any production eligibility discussion.
