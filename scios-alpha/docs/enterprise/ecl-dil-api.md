# ECL + DIL API

**Label:** `ALPHA_NON_PRODUCTION`  
**Base:** Control Plane `http://127.0.0.1:3000`  
**Envelope:** `{ schema, label, autoTrade: false, productionEligible: false, winRateClaim: null, data }`

## How it works

All routes are handled by `apps/control-plane-api/src/routes/eclDil.ts` using in-process `@scios/ecl-dil`. CORS is open for the local Shell. Errors: `400` validation, `404` unknown market/proposal, `500` internal (logged, never painted READY).

## `/v1/ecl/*`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/ecl/snapshot` | Instruments, positions, trades, bankroll, session, markets, guardrail |
| GET | `/v1/ecl/instruments` | Business objects |
| GET | `/v1/ecl/positions` | Open positions + uPnL |
| GET | `/v1/ecl/trades` | Simulated trades |
| GET | `/v1/ecl/bankroll` | Equity / cash / margin / reserved |
| GET | `/v1/ecl/sessions` | Session summary |
| GET | `/v1/ecl/risk` | Bucket + scores |
| GET | `/v1/ecl/audit` | Structured decision/rule/session/risk/proposal log |
| GET | `/v1/ecl/audit/decisions` | Decision subset |
| GET | `/v1/ecl/audit/rules` | Rule-fire subset |
| GET | `/v1/ecl/audit/sessions` | Session subset |
| GET | `/v1/ecl/report` | PnL, volatility, risk exposure, edge stability |
| GET | `/v1/ecl/report/{pnl,volatility,risk,edge}` | Single report |
| GET | `/v1/ecl/guardrail` | Limits + breaches + recommendation |
| PUT | `/v1/ecl/guardrail` | Update limits (`maxDailyLoss`, `maxPositionSize`, `maxConcentration`, `kellyCap`) |
| POST | `/v1/ecl/engine/audit-eval` | BUILD_SUITE_V1 audit (`engine=audit-engine-v1`). Missing `riskScore` ⇒ **UNKNOWN**. `continuousReady=true`, `continuous=false`. |
| GET | `/v1/ecl/engine/suite` | BUILD_SUITE_V1 inventory. Analog compose, not digital COMPUTE. |
| GET | `/v1/ecl/engine/build` | Alias of `/v1/ecl/engine/suite`. |
| POST | `/v1/ecl/engine/limit-eval` | Analog limit eval vs existing `maxDailyLoss` / bucket `maxExposure` / `maxLeverage`. Advisory only. Not a 5% invented ratio. |
| POST | `/v1/ecl/engine/prediction` | Deterministic DIL probability analog (`expectedReturn` = model−implied). **No hardcoded 0.025.** `calibratedLive=false`. |
| POST | `/v1/ecl/engine/risk-eval` | Analog risk. Caller vol+drawdown formula or book `dilRisk`. Missing instrument ⇒ UNKNOWN. |
| GET | `/v1/ecl/engine/kg` | Wave-1 analog overlay. `macro:rates` fixture only when a macro signal exists (`analog`, `live=false`). `nationalGraph=false`. |
| GET | `/v1/ecl/engine/lineage` | Analog chain labels + pointer to canonical `GET /v1/lineage/:runId`. Not a durable ledger. |
| GET | `/v1/ecl/engine/evidence` | Signals from the simulated book. Empty ≠ padded `sector:tech` 0.4. |
| POST | `/v1/ecl/engine/decision` | Analog ALLOW/HOLD/BLOCK. `autoDecide=false`. UNKNOWN ⇒ HOLD. |
| POST | `/v1/ecl/engine/execution-sim` | Fill **preview** only (`previewFillPrice`). `executed` stays false. |
| POST | `/v1/ecl/engine/cockpit-compute` | Compose prediction+risk+audit+limit+decision+execution. Does not flip `INSPECT_ONLY`. `executed=false`. |
| GET | `/v1/ecl/engine/build-v2` | BUILD_SUITE_V2 inventory. In-memory ledger, `durable=false`, `ready=false`. |
| GET | `/v1/ecl/engine/build-v3` | Inventory + durable adapter status. `ready=false` `autoTrade=false`. `OPTIONAL_INFRA_READY` only if live Postgres connect succeeded. |
| GET | `/v1/ecl/engine/infra` | Postgres connectivity + pool state + daemon heartbeat. ALPHA adapter, not BETA fabric. `pgDriver=ABSENT` until `pg` is installed. Daemon `enabledInBoot=false`. |
| CLI | `apps/sci-cli/sci.cjs` | SCI_CLI_SUITE_V2: audit/limit/compute/ledger/pnl/risk/infra/explain/tail. `--json` compact. Not a trading bot. |
| POST | `/v1/ecl/engine/ledger/append` | Append DECISION or EXECUTION_PREVIEW to in-memory ledger. Not durable. |
| GET | `/v1/ecl/engine/ledger` | List in-memory ledger entries. `persisted=false` `durable=false`. |
| GET | `/v1/ecl/engine/pnl-book` | Preview notional (`size × previewFillPrice`). `preview=true` `realized=false`. Missing price/size skipped, not 0. |
| GET | `/v1/ecl/engine/risk-book` | Sum of finite decision `riskScore`. Missing riskScore skipped (UNKNOWN), not 0. |
| POST | `/v1/ledger/append` | Alias of engine ledger append. `durable=true` only after optional Postgres INSERT succeeds. `autoTrade=false`. |
| GET | `/v1/ledger` | Alias of engine ledger list. |
| GET | `/v1/pnl-book` | Alias of engine pnl-book. Always `preview=true`. |
| GET | `/v1/risk-book` | Alias of engine risk-book. |
| GET | `/v1/ecl/clients` | Multi-client inventory. Desktop REFUSED (Shell is AppHost). Hospitality/healthcare SKIPPED. Daemon PREPARED_DISABLED. CLI `SCI_CLI_SUITE_V1` ALPHA ops tool. |
| GET | `/v1/ecl/engine/risk-book` | Sum of finite decision `riskScore`. Missing riskScore skipped (UNKNOWN), not 0. |
| POST | `/v1/ecl/engine/kg/registry` | Analog overlay registry add. `nationalGraph=false` `live=false`. |
| GET | `/v1/ecl/engine/kg-v2` | Registry-filtered overlay. Empty ⇒ UNKNOWN. Not a hardcoded KG. |
| GET | `/v1/ecl/engine/evidence-v2` | Ledger-derived signals. Empty ≠ padded demo. |
| GET | `/v1/ecl/engine/reporting` | Snapshot of pnl-book + risk-book + ledgerSize. Preview-only. |
| POST | `/v1/ecl/engine/cockpit-compute-v2` | V1 compose + in-memory ledger append. `INSPECT_ONLY`. `autoTrade=false`. `executed=false`. |
| GET | `/v1/ecl/architecture` | Identity, honesty, compose map, doc pointers, blueprint inventory |
| GET | `/v1/ecl/blueprints` | LDA/KG/DSL/distributed mapping — prepared, `enabled:false`, `persisted:false`. Not a second OS. |
| GET | `/v1/ecl/infra` | Prepared P2 hooks (OIDC/OTLP/ledger/live feeds/live calibration). `enabled=false`. GET does not persist. |
| GET | `/v1/ecl/feeds` | Feed registry (13 primary types: prediction.kalshi/polymarket + market/macro/news/risk). Default `SIMULATION_ONLY`. `liveCertified=0`. `persisted:false`. |
| GET | `/v1/ecl/deployment` | Compose inventory (36 modules). `enabledRuntimes=false`. No second OS/Shell/workflow engine. |
| GET | `/v1/ecl/realistic-sim` | Realistic simulation layer (risk/causal/timeline analogs). `SIMULATION_ONLY`. Not Monte Carlo. `persisted:false`. |
| GET | `/v1/ecl/professional` | Role catalog (16 families incl. AllDomains) + 8 professional engines + 16 sandboxes. `enabled=false`. `SIMULATION_ONLY`. 200 seeds / 9 archetypes. Unmapped domains `RESEARCH_REQUIRED`. `persisted:false`. |
| GET | `/v1/ecl/roles` | Alias of `/v1/ecl/professional`. |
| GET | `/v1/ecl/professional/compile` | SAFE compile test: 9 archetypes via Experience Compiler; unmapped catalogs `SKIPPED_RESEARCH_REQUIRED`; LDA `REFUSED`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/validate` | Validation wave over compile evidence. 9 archetypes PARTIAL; 191 seeds UNKNOWN (never PASS). Constraints may `PASS_CONSTRAINT`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/validate/deep` | Deep inspect of 9 workspaceSpecs (panels, JTBD, live_execution blocked, UNVALIDATED science). 200 roles still not PASS. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/activate` | SAFE session activation of 9 compiled archetypes. Sandboxes stay `SIMULATION_ONLY`. LDA `REFUSED`. DSL/Kafka `SKIPPED_UNKNOWN`. `roles200Activated:false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/stabilize` | Reconcile leftovers: 9 CONSISTENT specs, 191 INCOMPLETE, ABSENT views DISABLED, LDA REFUSED. `roles200Stabilized:false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/modules` | Profession module expansion (hospitality/healthcare/PM/consulting/sales/real-estate/supply-chain). Analog adapter contracts only. ABSENT catalogs `SKIPPED_RESEARCH_REQUIRED`. `?professionId=` applies adapters with empty payload. `liveDomainData=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/os-blueprints` | Cyber / investment / ops OS blueprint analog contracts composed onto existing modules. Wave-1 KG overlay (not Palantir). SAP-alt step labels (not ERP; HR `SKIPPED_RESEARCH_REQUIRED`). `?blueprintId=` applies with empty payload. `liveSiem/liveBroker/liveErp=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/digital-activation` | SAFE inspect of requested DIGITAL KG / LDA PASS / 191 seed COMPLETE / 200/200 roles. Those flips stay `REFUSED`. Analog contracts remain analog. `nationalGraph=false` `ldaPass=false` `roles200Stabilized=false` `seedsComplete=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/precision-upgrade` | SAFE inspect of requested layered KG spine, hospitality/healthcare domain-enable, DIGITAL module flows, `minSeriesLength=30`. Causal paths / ABSENT enable / pad-to-30 stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Visual tokens SCI palette only. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/cyber-bridge` | SAFE inspect of cyber RESEARCH_COMPLETE → ENABLED plus Cyber↔Investment RiskEvent bridge. Cyber stays PARTIAL analog (`researchComplete=false` `domainEnabled=false`). Empty cyber series remains UNKNOWN. Bridge overlay maps to Wave-1 `risk`/`AFFECTS`. LDA/KG/191/200 stay `REFUSED`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/activation-review` | SAFE inspect of requested REFUSED→PASS (LDA, digital KG, 191 seeds, 200/200 roles), domain ENABLE, INSPECT→COMPUTE. Those flips stay `REFUSED`. Hospitality/healthcare `SKIPPED_RESEARCH_REQUIRED`. Next-wave ledger/feeds/auto-audit specs `PREPARED_DISABLED`. `autoDecide=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/enterprise-prep` | SAFE inspect of requested cross-domain scenario engine, durable ledger, and live SIEM/broker/ERP ingestion. Live ingestion + durable fabric stay `REFUSED`. Healthcare/hospitality scenarios `SKIPPED_RESEARCH_REQUIRED`. Auto-audit/limits `PREPARED_DISABLED`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/automation-prep` | SAFE inspect of requested continuous auto-audit, automatic limit freeze/hold/block, and data-driven scenario generation. Those stay `REFUSED`. Healthcare/hospitality chains `SKIPPED_RESEARCH_REQUIRED`. HITL remains AGENT→PROPOSAL→HUMAN→DECISION. `autoDecide=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/visibility-prep` | SAFE inspect of requested gradual Cockpit activation, analog→digital hints, research→enable progress bars, and digital-ready KG markers. Those stay `REFUSED`. Honest REFUSED/ANALOG/SKIPPED status chips may appear. Auto-audit/limits/scenarios are not READY. Next 7 PM tasks `PREPARED_DISABLED` or already HITL. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/visibility-activation` | SAFE inspect of 10 requested episodes flipping visibility-prep `REFUSED→PASS`, declaring engines ready, inventing domain %, marking KG digital/causal ready, and live panel linking. Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. `passGranted=false`. `visibility-prep` remains `REFUSED`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/visibility-deep` | SAFE inspect of 10 requested deep-governance episodes flipping visibility-activation `REFUSED→PASS` via APPROVED/validated stamps, hospitality/healthcare research=true, causal_ready, gradual, and cockpit engine binding. Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. `passGranted=false`. Prior visibility waves remain `REFUSED`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/explainability-prep` | SAFE inspect of requested live audit/limit/scenario explain layers, causal path preview, hospitality/healthcare explain panels, and a unified explainability bus. Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. HITL remains AGENT→PROPOSAL→HUMAN→DECISION (`ANALOG_CONTRACT`). `showCausalPaths=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/explain-visibility` | SAFE inspect of seven named build commands plus master `buildExplainabilityAndVisibilityWave`. Live enable, `passGranted`, gradual mode, causal preview, and a second explain bus stay `REFUSED`. Hospitality/healthcare Explain buttons `SKIPPED_RESEARCH_REQUIRED`. HITL `ANALOG_CONTRACT`. `applied=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/digital-workspace-compute` | SAFE inspect of `activateDigitalKG`, `generateDomainWorkspaces`, `enableCockpitComputeMode`, plus master. Causal/national graph stay `ANALOG_OVERLAY`. Hospitality/healthcare desks `SKIPPED_RESEARCH_REQUIRED`. Cyber/investment analog on the one Cockpit. `computeMode=INSPECT_ONLY`. HITL unchanged. `applied=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/activation-pass` | SAFE inspect of the MASTER ACTIVATION SUITE (`runMasterActivationSuite`). Requested REFUSED→PASS, READY, PERSISTED, FULL_SUITE, live engines, Digital KG, domain desks, and COMPUTE stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. HITL `ANALOG_CONTRACT`. `applied=NONE`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/phase-core` | SAFE inspect of requested PHASE 1–8 / DeepSeek 100 / Copilot 100 (engines, durable books, daemon, desktop/mobile, catalogs, PHI, HITL V2/V3, infra ready=true, `sci-os-x10/` tree, ALPHA→BETA). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog V1/V2 remain. `executed=false` `daemonInBoot=false` `parallelTree=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/phase-core/blueprints` | Copilot 4-box contract catalog: API + architecture + tables + pipeline + orchestrator mapped onto existing analog surfaces. `filesWritten=0`. No `sci-os-x10/` tree. Residual 81–100 are refuse-plans. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/audit-engine-core` | SAFE inspect of requested 1s audit loop, `continuousMode.enabled=true`, auto freeze/hold/block, `riskScore ?? 0`, and 5% daily-loss halt. Those stay `REFUSED`. Analog `POST /v1/ecl/engine/audit-eval` remains request-driven. `loopStarted=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/limit-engine-core` | SAFE inspect of requested 1s limit loop, invented 1e6/1.5/5%/10% auto freeze-block, and `verify()=true`. Those stay `REFUSED`. Analog `POST /v1/ecl/engine/limit-eval` uses GuardrailLimits + RiskBucket. `loopStarted=false`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/ledger-core` | SAFE inspect of requested `src/sci-os-x10.ts` 1000-task durable fabric (`import pg`, `DurableActivator.durable=true`, hot `DELETE`, empty VaR=0, hospitality/healthcare Domain). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog `POST /v1/ledger/append` + preview pnl/risk books. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/domain-fabric` | SAFE inspect of requested `src/domain-fabric.ts` 1000-task DomainFabric (`new DomainFabric` 7 domains, hospitality/healthcare live instruments, PHI sandbox, FRED/news `ingested++`, lexicon sentiment). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog modules: cyber/investment GET. `megaFiles=0` `liveDesks=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/kg-fabric` | SAFE inspect of requested `src/kg-fabric.ts` 1000-task KG fabric (live nodes/edges, `ingested++` without fetch, causal/do-calculus, Palantir national graph, `sci-os-x10.ts` dep). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog overlay: `GET /v1/ecl/engine/lineage`. `nationalGraph=false`. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/scenario-fabric` | SAFE inspect of requested `src/scenario-fabric.ts` 1000-task ScenarioFabric (`new Pool`, hospitality/healthcare templates, `load('ready')`, `runner.core.run`, parallel `runBatch`, causal library + `Math.random` Monte Carlo). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog: `GET /v1/ecl/professional/automation-prep`. `executed=false` `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/causal-fabric` | SAFE inspect of requested `src/causal-fabric.ts` 1000-task CausalFabric (`new Pool`, ATE empty→0, invented CI, backdoor DFS as Pearl, `Math.random` MC, governance `enforce` block, auto-fixer). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog: `GET /v1/ecl/engine/lineage`. `causalQueryEngine=ABSENT`. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/governance-fabric` | SAFE inspect of requested `src/governance-fabric.ts` 1000-task GovernanceFabric (live rules INSERT, HITL auto-decide, override without human, freeze/block, hospitality/healthcare policy). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog HITL: `POST /v1/ai/proposals/:id/review`. `autoDecide=false`. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/infra-fabric` | SAFE inspect of requested `src/infra-fabric.ts` 1000-task InfraFabric (`new Pool`, probe always `up`, daemon heartbeat, Prometheus scrape as live OTLP, READY stamps, `autoRecovery=true`, failover `success=true`). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog: `GET /v1/ecl/engine/infra`. `daemonInBoot=false`. `OPTIONAL_INFRA_DEGRADED` without PG. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/security-fabric` | SAFE inspect of requested `src/security-fabric.ts` 1000-task SecurityFabric (live sandbox isolation, `new Function` policy eval, auto-block/freeze, hospitality/PHI desks, HITL auto-approve). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog HITL: `POST /v1/ai/proposals/:id/review`. Analog audit: `GET /v1/ecl/audit`. `autoDecide=false`. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/os-fabric` | SAFE inspect of requested `src/os-fabric.ts` 1000-task OSFabric (daemon loops in boot, Electron viewer, 4 domain mobile desks, `connectAll` always-on, `lrgReady` 16/16). Those stay `REFUSED` or `SKIPPED_RESEARCH_REQUIRED`. Analog: `GET /v1/ecl/clients` + `GET /v1/ecl/engine/infra`. `daemonInBoot=false`. Desktop REFUSED (Shell is AppHost). Mobile SKIPPED. `megaFiles=0`. `persisted:false`. Not READY. |
| GET | `/v1/ecl/professional/cursor-runbook` | SAFE inspect of requested Cursor Integration RUNBOOK V1 and Full Buildout (those stay `REFUSED`). Also lists Realistic Runbook V1 (`realistic[]`): existing `eclDil.smoke.ts`, `apps/sci-cli/sci.cjs`, `pnpm sci:status`, GET `/v1/ecl/engine/*` + `/v1/ecl/professional/*`, GET `/v1/ecl/audit` (no hash PASS), Shell probe `:4000` without boot. Analog: `pnpm` + `SCI_CLI_SUITE_V2`. `execution=false` `durable=false` `daemonInBoot=false` `filesInvented=0`. Flags unchanged. Not READY. Not BETA. |
| GET | `/v1/ecl/workspace` | Cockpit composite |

Audit event: `{ id, time, kind, user, marketId?, decision?, reason, risk, scores?, label }`.

## `/v1/dil/*`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/dil/markets` | Normalized snapshots |
| GET | `/v1/dil/markets/:id` | One market |
| POST | `/v1/dil/markets/refresh` | Bump `asOf`, or pull `live_unverified` if `SCI_DIL_FEED=live_unverified` |
| GET | `/v1/dil/probability/:id` | Model vs implied + confidence |
| GET | `/v1/dil/edge/:id` | `edgeScore`, class, mispricing, whale |
| GET | `/v1/dil/risk/:id?horizon=5m\|24h\|72h` | Bankroll-aware size + `noNewRisk` |
| GET | `/v1/dil/scenario/:id?horizon=` | Horizon compare (preview, `persisted:false`) |
| GET | `/v1/dil/decision/:id` | Preview decision (`persisted:false` — does not write audit) |
| POST | `/v1/dil/decision` | Body `{ marketId, horizon }` — persists audit |
| GET | `/v1/dil/workspace?horizon=` | Console composite (rows include `scenario`, `feeds`, `rowStatus`, `trackRecord` slice; `persisted:false`) |
| GET | `/v1/dil/feeds` | Feed honesty + registry (`actual=simulated_alpha` unless `SCI_DIL_FEED=live_unverified`). Live remains UNVERIFIED, never certified. |
| GET | `/v1/dil/calibration` | Simulated Brier / bins / hypo PnL (`persisted:false`; live = UNKNOWN) |
| GET | `/v1/dil/track-record` | Closed-loop rows (`persisted:false`) |
| POST | `/v1/dil/resolve` | `{ marketId, outcome: 0\|1, simulated: true }` only |

## `/v1/ai/*`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/ai/proposals` | List (never executable; `persisted:false`) |
| POST | `/v1/ai/proposals` | `{ marketId, horizon }` → proposal |
| GET | `/v1/ai/proposals/:id` | One proposal (`persisted:false`) |
| POST | `/v1/ai/proposals/:id/review` | `{ decision: accept\|reject, note? }` — **audit only**, `executed:false`, `autoTrade:false` |
| GET | `/v1/ai/signals` | Stub/manual signals |
| POST | `/v1/ai/signals` | Manual analyst input |

Governance string on proposals: `AGENT → PROPOSAL → HUMAN → DECISION`.

## Limitations

- No authentication beyond `AUTH_MODE=local-development`.
- No OTLP spans yet — structured logs + in-process counters only.
- Live venue HTTP is **optional and UNVERIFIED** behind `SCI_DIL_FEED=live_unverified`. Default is **ABSENT** (`simulated_alpha`). Live ticks are not a calibration source and never auto-trade.
- GET envelopes set `persisted: false` (no audit write). POST `/v1/dil/markets/refresh` may mutate the in-memory book (`bookMutated`) without writing audit.

## Future work

- Idempotent proposal IDs persisted with CF11 jobs (adapter, not a second workflow engine).
- Signed audit export.
