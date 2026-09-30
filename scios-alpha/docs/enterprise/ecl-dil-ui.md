# ECL + DIL cockpit UI

**Label:** `ALPHA_NON_PRODUCTION`  
**Shell:** `apps/cockpit-ui` only (ADR-SHELL-001). Tokens: `packages/design-system`.

## How it works

Chain: **ui-tokens** (`sciTokens`) → **ui-core** (safe-dom + primitives) → **layout** (12-col metrics, heat maps, tables) → **molecules** (status chip, metric card, heat cell) → **organisms** (`renderDilConsole`, `renderEclConsole`).

Professional role `arch.prediction_decision_analyst` (**Prediction & Decision Analyst**) is composition data in `professional-ux.js` + `archetypes.json` + experience compiler. It does not fork a second app.

| View | Question | Route |
|------|----------|--------|
| Intelligence (`#dil`) | Where is the edge? What size fits? What does the agent propose and why? | `GET /v1/dil/workspace` · `POST /v1/ai/proposals` |
| Reporting (`#ecl`) | Where do PnL and risk stand today? | `GET /v1/ecl/workspace` (feeds + infra placeholders) |
| Decisions (`#decisions`) | Human accept/reject of DIL proposals (audit only) | `GET /v1/ai/proposals` · `POST /v1/ai/proposals/:id/review` · calibration panel |
| Evidence (`#evidence`) | Audit chain including human_review | `GET /v1/ecl/audit` |
| System → Architecture | How is this layered on the live OS? | `GET /v1/ecl/architecture` |

Intelligence includes: market overview, edge map, risk map, whale tracker, 5m/24h/72h horizon, venue filter, sort, recommendation with **why** + workspace `scenario` (base vs compare horizon), **simulated track-record / Brier panel**, live-adapter honesty (`ABSENT` by default), signal stubs, guardrail chip (`OK` / `WARN` / `UNKNOWN`; advisory breach is WARN, not system ERROR).

Reporting includes: equity, session PnL, drawdown, volatility, daily/weekly/monthly period toggle, positions, audit tail, **same track-record panel** (one product, not a second dashboard).

Context bar identity: Product **SCI OS ×10**, Maturity **ALPHA_NON_PRODUCTION**, Cockpit **ALPHA_LIVE** when Control Plane is reachable — never a false READY chip. Empty / error / offline: `createEmptyState`, `createErrorState`, OFFLINE copy when Control Plane fetch fails. Uncertainty is visible (confidence band + ALPHA guess note). Command palette: Intelligence, Reporting, Decisions, Work, Evidence, Calibration. Hash deep-links: `/#dil`, `/#ecl`, `/#decisions`, `/#evidence` (same Shell, `history.replaceState`).

Analyst loop (ALPHA): Intelligence → Request proposal → Open Decisions → Record accept/reject (audit only) → Open Evidence.

Technical views remain Engineering: Risk/Gov Studio, Execution Monitor, System Health — unchanged boot contract.

## Limitations

- Consoles are inlined vanilla DOM (no Vite second Shell).
- Heat maps are CSS cells, not WebGL.
- Role expansion is additive; golden GW1 Market Analyst path is unchanged.

## Future work

- Progressive disclosure density modes on DIL tables.
- Keyboard row navigation beyond focusable rows.
