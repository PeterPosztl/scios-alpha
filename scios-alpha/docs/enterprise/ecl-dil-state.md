# ECL/DIL — HUMAN_USABLE_ALPHA scoreboard

**Label:** `ALPHA_NON_PRODUCTION`  
**Identity:** `ENTERPRISE_GRADE_ALPHA` — professional OS language, **not** READY / holeless / enterprise GO.  
**Stop condition (authorized):** `HUMAN_USABLE_ALPHA`  
**Boot lock:** `start-sci-os.cjs` · Control Plane `:3000` · Shell `:4000`

| STATE_GOAL | Value | Evidence |
|------------|--------|----------|
| architecture.unified | **true** | `@scios/ecl-dil` composed into Control Plane + Cockpit; `SCI_SYSTEM_IDENTITY` |
| cockpit.unified | **true** | One Shell `apps/cockpit-ui`; Intelligence + Reporting + Engineering |
| ecl.unified | **true** | `/v1/ecl/*` finance / risk / reporting / guardrail / audit |
| dil.unified | **true** | `/v1/dil/*` probability / edge / risk / **scenario on workspace rows** / calibration / track-record / feeds honesty |
| live.feeds | **ABSENT** (default) | Optional `SCI_DIL_FEED=live_unverified` — UNVERIFIED, no auto-trade, does not prove calibration |
| oidc / otlp / durable ledger | **ABSENT / in-memory** | Honesty placeholders on `/v1/ecl/architecture` + `bookIntegrity` — **P2, not ALPHA GO** |
| ai.proposals.unified | **true** | `/v1/ai/proposals*` · `POST …/review` accept/reject **audit only** · `requiresHuman=true` · `autoExecute=false` |
| designSystem.unified | **true** | `packages/design-system` tokens → Cockpit CSS variables |
| diagnostics.unified | **true** | `system-coherence-state.json` + `track-record-alpha.json` |
| reporting.unified | **true** | Reporting console + ECL reports + track-record panel |
| intelligence.unified | **true** | Intelligence console + DIL workspace + track-record panel |
| ecl.alphaUsable | **true** | Reporting console (PnL, drawdown, volatility, audit) |
| dil.alphaUsable | **true** | Intelligence console (maps, horizon, scenario, calibration) |
| cockpit.professional | **fully_operational_alpha** | Intelligence, Reporting, Evidence, Decisions |
| cockpit.technical | **fully_operational_alpha** | Risk/Gov, Execution Monitor, System Architecture |
| guardrails | **active** (advisory) | breach → WARN + `noNewRisk` — not a broker kill-switch |
| ai.proposals | **human_required** | guessMode; proposal failure is visible |
| dil.probability.calibrated | **live UNKNOWN** | Simulated `ADEQUATE_ALPHA` (n≥8 Brier/bins). Not live. |
| dil.edge.measured | **simulated_alpha** | mean \|edge\| + sign-hit on seeded closed-loop |
| dil.risk.behaviourTested | **simulated_alpha** | noNewRisk rows did not enter |
| pnl.trackRecord.collected | **simulated_alpha** | Hypothetical PnL + hypo drawdown — not a live book |
| decisions.logged | **true** | POST decision + seeded history; GET preview does not write |
| scenarios.logged | **true** | Scenario base/stressed stored on track rows |
| calibration.status | **ADEQUATE_ALPHA** (simulated) | Live remains UNKNOWN |
| holeless | **false** (not required) | 10000 WUs mapped, not executed |
| READY | **false** | Simulated feeds. No live track-record. |
| autoTrade | **false** | Literal; live `POST /v1/dil/resolve` rejected unless `simulated:true` |
| parallelOS / secondShell | **false** | Locked |

Proof: `diagnostics-export/track-record-alpha.json` · `diagnostics-export/calibration-alpha-report.json` · `diagnostics-export/ecl-dil-alpha-proof.json` · `diagnostics-export/system-coherence-state.json`.  
Continuous diagnostics: `diagnostics-export/continuous-alpha-state.json`.  
Infra honesty: `diagnostics-export/infra-alpha-state.json`.  
Cursor feedback: `diagnostics-export/cursor-feedback.json`  
Build log: `diagnostics-export/cursor-build-log.json` (1000-point **catalog** mapped; not 1000 executed stubs).  
Desktop: `docs/enterprise/desktop-launch.md` (canonical `SCI-OS-Start.bat` — not a second boot).

### ALPHA-safe batch applied (not READY)

Prior: WORKSPACE-ROW-500 · GET-WORKSPACE-PERSISTED-FLAG · LIVE-MARKET-WITHOUT-INSTRUMENT · CMDK-DECISIONS-WORK · TECH-PANEL-STALE-NULL · DOC-LIVE-HTTP-STALE · DIL-HUMAN-DECISION-CLOSE · NO-HASH-DEEP-LINKS.  
This pass: FEED-BOOK-INTEGRITY · INFRA-PLACEHOLDERS-OIDC-OTLP-LEDGER · ROW-UNKNOWN-UX · OPEN-DECISIONS-GLUE · CALIBRATION-SPARSE-BINS-UX · HUMAN-REVIEW-EVIDENCE · SNAPSHOT-LEDGER-MODE.

**1000-point stop (honest):** GAP catalog `gapCount=1000` already exists at `docs/enterprise/v1-command-box/ecl-dil-gap-overlay.json`. Mapping those points is **not** executing 1000 WUs. Max-build **stops**. READY stays **false**.

### Master plan TARGET vs ACTUAL (not a READY gate)

| Target in 1000-point box | Actual | Class |
|--------------------------|--------|--------|
| humanUsableAlpha | **true** | ALPHA slice |
| architecture / cockpit / ECL / DIL / proposals / design / reporting / intelligence unified | **true** | compose-in-shell |
| feeds.live | **false** (ABSENT; optional live_unverified) | P2 / SIMULATION_ONLY |
| probability.calibrated (live) | **false** / UNKNOWN | simulated ADEQUATE_ALPHA only |
| trackRecord.established | **simulated_alpha** | not live book |
| ledger.durable | **false** (ECL in-memory) | P2; local run index ≠ ECL ledger |
| oidc.integrated | **false** / ABSENT | P2/P3 full vision |
| otlp.integrated | **false** (probe PARTIAL, SDK ABSENT) | P2 |
| windows.desktopEntry | **documented canonical** | existing Start.bat / packaged CMD |
| READY | **false** | never implied by the AND-stop above |

Analyst loop (ALPHA, not READY): **Home** → Intelligence → Request proposal → Open Decisions → Record accept/reject (audit only) → Open Evidence. Home cards include Decisions/Evidence. System Status paints ALPHA_LIVE, never a raw `ready=true`. Reporting workspace carries feeds/infra honesty.

The 1000-point **AND-stop** (live feeds + live calibration + OIDC + OTLP + durable ledger) is **full vision**, not the authorized ALPHA stop. Overlay: `docs/enterprise/v1-command-box/05-ECL-DIL-GAP-MAPPING.md`.

Inspiration (learn-from, not clone): SAP-like ECL spine · Palantir-like dual cockpit · Citadel-like DIL · Google-like nav · Apple-like tokens · Bloomberg-like operational panels — all composed into **SCI OS ×10**.
