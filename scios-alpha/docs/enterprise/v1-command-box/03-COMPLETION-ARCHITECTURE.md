# SCI OS ×10 — V1 befejezési architektúra (A + B)

**Label:** `ALPHA_NON_PRODUCTION`  
**Kötelező olvasmány:** `00-AWAKENING-REPORT.md`, Product Memory, `CURRENT_SYSTEM_TRUTH.md`  
**Munkagráf:** 1000 GAP × 10 WU = **10000** (`completion-work-units.json`)  
**Hullámok (GAP):** W0 84 · W1 278 · W2 333 · W3 303 · W4 2  
**Szabály:** kiterjesztés, nem második OS. Shell = `apps/cockpit-ui`. Boot = `start-sci-os.cjs`. Portok 3000/4000.

Minden B.* tételre a 10 lépés: **SPEC → FILE → INTERFACE → IMPLEMENT → WIRE → ERROR → O11Y → TEST → PROOF → GATE**.

Prioritás: **P0** boot/token/shell-kompozíció · **P1** engine adapter + GW1-őrzés · **P2** konzol-mélység / OIDC / OTLP export.

---

## A. OS-szintű architektúra

### A.1 Rendszerkép (high-level)

```
Windows host
  └─ bootstrap-capsule.cjs
       └─ start-sci-os.cjs (EGYETLEN orchestrator)
            ├─ Control Plane :3000  apps/control-plane-api
            │     engines: vertical-slice, governance, model-registry,
            │              observability, jobs (osSession), product-kernel
            └─ Shell / AppHost :4000  apps/cockpit-ui
                  ├─ Professional path (Home, Work, Entity, Analyze, Evidence)
                  └─ Technical consoles (composed, not new ports)
                        admin · developer · ai-center · obs · security · ops · platform
```

V1 `apps/os-shell` **nem** új HTTP szerver. A Shell chrome (command line, process/system monitor, event bus) a cockpit + `/v1/os/shell` + `packages/os-environment`.

### A.2 Rétegek

| Réteg | Authority | V1 mapping |
|-------|-----------|------------|
| Tokens | `@scios/design-system` | `packages/ui-tokens` re-export + kiterjesztés |
| UI core→organisms | új `@scios/ui-*`, inlinable JS | cockpit HTML-be injektálva, mint `primitives.js` |
| Routing/state | `@scios/routing`, `@scios/state-engine` | `showView` + History API; nem Redux-klón kötelező |
| Engines | adapter a meglévő package-ekre | `workflow/ai/obs/security-engine` |
| Apps | Experience / workspace modules | 7 konzol + shell chrome |
| Platform | start-sci-os, CP, local-foundation | platform-console Technical view |

### A.3 Kapcsolatok

- **API:** minden konzol a Control Plane-t hívja (`CONTROL_URL`). Új route-ok `/v1/admin|ai|obs|sec|ops|plat/*`.
- **Event:** `packages/observability` `EventEnvelope` + katalógus (`sci.ui.*`, `sci.wf.*`, `sci.ai.*`, `sci.sec.*`, `sci.ops.*`).
- **Message:** first-release in-memory bus; NATS/Kafka P2 (már elutasított mint P0).
- **Pipeline:** GW1 `VERTICAL_SLICE_STAGES` marad a kanonikus spine; `workflow-engine` **adapter**, nem második pipeline.

### A.4 Failure-modek

| Mode | Viselkedés |
|------|------------|
| CP down | Shell DEGRADED banner; Home skeleton; nincs hamis READY |
| Optional PG/Redis/Docker absent | `OPTIONAL_INFRA_DEGRADED`, exit 0 |
| OTEL collector down | local logs folytatódnak; obs console UNKNOWN |
| Session expired | protected Technical route hold |
| Illegal job transition | HTTP 409 + audit |
| Agent policy deny | proposal megmarad, side effect nincs |
| Palette drift | gate fail |
| Second boot detected | refuse |

### A.5 Observability teljes kép

Local structured JSON log + `x-request-id` (már van) → in-memory metrics → **query API** (hiányzik) → obs console. OTLP **opcionális**; `otelHealth.ts` ma probe, nem SDK export. Dashboards = Technical widgets, nem Grafana-fork P0.

### A.6 Security teljes kép

Most: `AUTH_MODE=local-development`, 4 szerep a `governance-engine` mátrixban, nincs user store, nincs OIDC.  
Cél ALPHA: session manager + permission checks a `/v1/*` mutációkon + audit.  
OIDC = **P2 / FULL VISION**, nem first-release hazugság.

### A.7 AI-integráció teljes kép

GW1: in-process `baseline-logistic`, NON-PRODUCTION. Cockpit AI panel: magyarázat, nem végrehajtás.  
`ai-engine`: agent registry + pipeline runner, **minden kimenet Proposal**, citation kötelező, `GOVERNANCE > AGENT`. LLM kulcs opcionális, GW1-et nem blokkol.

### A.8 Operations teljes kép

CF11 job state + `/v1/os/jobs` **már él**. Hiány: queue depth UI, scheduler, durable worker (BullMQ P2). Foundation smoke worker in-process.

### A.9 Platform teljes kép

Service registry JSON az `os-environment`-ben. Hiány: deployment map UI, environment manager (local-foundation / packaged / compose). Compose fájlok: `infra/docker/` — V1 ezt nem ismerte.

---

## B. Konkrét implementáció (fájl / komponens / API)

Dependencia-lánc: **B.1 → B.2 → B.3 → B.4 → B.5 → B.6+B.7+B.13+B.12 → B.8…B.11 → B.14 → B.15…B.21**.

### B.1 UI TOKENS — P0

**Fájlok:** `packages/ui-tokens/package.json`, `src/index.js`, `src/color.js`, `src/spacing.js`, `src/typography.js`, `src/elevation.js`, `src/motion.js`, `src/grid.js`, `src/tokens.css`, `src/assert-palette-lock.js`, `src/ui-tokens.test.js`

**Komponensek:** nincs UI widget; CSS változók + JS manifest.

**Interface:** `SciTokenContract` (color, space, type, elevation, motion, grid, density, risk, evidence).

**API:** `exportCss()`, `exportJs()`, `assertPaletteLock()` — utóbbi fail, ha a paletta eltér Snow/Fog/Graphite/Navy/Red/Ice.

**Adatmodell:** `TokenManifest`, `DensityScale {COMFORTABLE,STANDARD,EXPERT}`.

**Hiba:** `TOKEN_PALETTE_DRIFT`, `TOKEN_CONTRAST_FAIL`.

**O11y:** `token.load`, `token.drift`; metric `token.contrast.fail_count`.

**Security:** tilos vendor theme; UXD-COLOR-001.

**AI-pipeline:** nincs.

**Lépések:** 1) re-export `@scios/design-system` 2) semantic kiterjesztés (proposal≠done) 3) motion 120fps + reduced-motion 4) 12-col grid token 5) cockpit `TOKEN_CSS` innen 6) teszt lock 7) proof JSON.

**Depends:** design-system. **Blocks:** minden UI package.

### B.2 UI CORE — P0

**Fájlok:** `button.js`, `input.js`, `card.js`, `modal.js`, `panel.js`, `index.js` + `CORE_BROWSER_SOURCE` (inlinable, mint primitives).

**Komponensek:** Button (primary/ghost/disabled/loading), Input (text/search/number/password), Card, Modal (focus trap), Panel.

**Interface:** `ButtonProps { actionId, label, variant, disabled, pending }`. Constitution: nincs actionId nélküli consequential control.

**API:** `createButton(parent, props)` … `CORE_BROWSER_SOURCE`.

**Adatmodell:** `ControlState: idle|pending|success|fail`.

**Hiba:** `CONTROL_WITHOUT_ACTION_ID`; modal ESC/focus restore fail.

**O11y:** `ui.core.action` + `ux.control.click` span.

**Security:** jelszó mező soha logban.

**Lépések:** implement → inline a cockpit `<script>`-be → cserélni ad hoc `button.go` / `ghost` fokozatosan (nem big-bang redesign).

### B.3 UI LAYOUT — P1

**Fájlok:** `grid.js`, `flex.js`, `breakpoints.js` (sm 640 / md 768 / lg 1024 / xl 1280), `container.js` (max 1180 professional), `layout.css`.

**Interface:** `GridSpec { cols:12, gap }`, `Breakpoint`.

**API:** `applyGrid`, `matchBreakpoint`.

**Hiba:** overflow; unknown breakpoint.

**O11y:** `ui.layout.reflow_ms`.

**Depends:** B.1. **Megjegyzés:** cockpit ma `auto-fill minmax(220px)`.

### B.4 UI MOLECULES — P1

**Fájlok:** `search-bar.js`, `filter-bar.js`, `data-row.js`, `info-tile.js`.

**API:** create* ; SearchBar kötése a meglévő `#globalSearch` + `GET /v1/search`.

**Modell:** `SearchQuery`, `FilterClause`, `RowIdentity`.

**Hiba:** empty, invalid filter, missing identity.

**Security:** query redaction.

### B.5 UI ORGANISMS — P1

**Fájlok:** `dashboard.js`, `table.js`, `form-engine.js`, `detail-view.js`.

**Interface:** `FormSchema` (fields, validation, actionId), `TableColumn`, `DashboardWidget`, `DetailViewSpec` (object type from product-kernel registry).

**API:** form submit → Action contract (`ADR-ACTION-001`), nem nyers fetch.

**Hiba:** validation, empty table, unknown object.

**Security:** no innerHTML from API.

### B.6 NAVIGATION — P0

**Fájlok:** `sidebar.js`, `topbar.js`, `breadcrumbs.js`, `router-bridge.js`.

**Most:** top primary nav, nincs sidebar, nincs breadcrumb, nincs URL.

**Cél:** `/?view=home|work|…|console.admin` + breadcrumbs Entity/Analyze/Evidence. Sidebar Technical konzolokhoz (nem Professional default).

**API:** `bindRouter(showView)` History API.

**Hiba:** `NAV_UNKNOWN_VIEW`, `NAV_PROTECTED_DENIED`.

**Security:** Technical konzolok role-gated.

**Depends:** B.13.

### B.7 STATUS / ERROR / LOADING — P0

**Fájlok:** `ui-status`: loading/success/warning/error/offline/**unknown.js**. `ui-error-loading`: `global-error-handler.js` (window.onerror + unhandledrejection), `global-loading-overlay.js`, `retry.js`.

**Nincs React Error Boundary** — a Shell vanilla. Global handler + banner a helyes minta.

**Modell:** `DimensionalStatus` (BOOT/CORE/CAPABILITY/…), tilos egyetlen READY flag (`REJ-FALSE-READY`).

**Hiba:** retry exhausted, overlay deadlock.

**Security:** crash redact.

### B.8 WORKFLOW ENGINE — P1

**Fájlok:** `packages/workflow-engine/src/{machine,transitions,guards,effects,audit,index}.ts`

**Interface:** `defineMachine`, `canTransition`, `transition`, `Guard`, `Effect`.

**API:** belső; CP `POST /v1/workflows/:id/transition` P2. P1: **adapter** a CF11 `TRANSITION_MATRIX` + GW1 stages fölött.

**Modell:** `WorkflowInstance`, `TransitionEvent`, `GuardResult`.

**Hiba:** `ILLEGAL_TRANSITION` (már van jobs-nál).

**O11y:** `sci.wf.transitioned`.

**Security:** effects → governance `evaluatePolicyDecision`.

**AI:** nincs autonóm transition.

**Depends:** vertical-slice, osSession jobs. **Tilos:** második GW1.

### B.9 AI ENGINE — P1

**Fájlok:** `command-center.ts`, `agent-manager.ts`, `pipeline-manager.ts`, `model-registry-adapter.ts` wrapping `@scios/model-registry`.

**Interface:** `Agent`, `AiPipeline`, `Proposal { citations[], actionId?, requiresApproval }`.

**API:** `POST /v1/ai/proposals` (nem execute). `GET /v1/models` már van.

**Modell:** `PipelineRun`, `Citation`.

**Hiba:** `AGENT_UNGOVERNED`, `PIPELINE_UNGROUNDED`, `MODEL_NON_PRODUCTION`.

**Security:** soha auto-execute; proposal badge (`UXD-APPROVAL-001`).

**Pipeline:** explain-only default; optional LLM; GW1 baseline-logistic érintetlen.

### B.10 OBSERVABILITY ENGINE — P1

**Fájlok:** ne forkoljuk `packages/observability`. Új `packages/observability-engine` **façade**: `logs.ts` (query buffer), `metrics.ts` (snapshot + names), `traces.ts` (span API; no-op ha nincs OTEL SDK), `dashboards.ts` (widget spec).

**API:** `GET /v1/obs/logs|metrics|traces` (in-memory ring, ALPHA).

**Modell:** `LogRecord`, `MetricInstrument`, `Span`, `CorrelationId` (már x-request-id).

**Hiba:** `OTEL_NOT_CONFIGURED` evidencével (már `otelHealth`).

**Security:** `redactLogMeta` kiterjesztése.

### B.11 SECURITY ENGINE — P1 (OIDC P2)

**Fájlok:** `auth.ts` (local principal), `roles.ts` (bridge governance Role), `permissions.ts`, `session-manager.ts` (osSession kiterjesztés).

**API:** `GET/PUT /v1/os/session` van. Kell: `GET /v1/sec/sessions`, `GET /v1/sec/auth-events`, deny audit.

**Modell:** `Principal`, `SessionRecord`, `AuthEvent`.

**Hiba:** 401/403 envelope.

**Security policy:** loopback bind default; mutations require `can(role, action)`.

### B.12 STATE ENGINE — P1

**Fájlok:** `store.js`, `selectors.js`, `reducers.js`, `async.js` — **kis** store a Shell sessionre (lastData, role, view, compiled experience). Nem enterprise Redux.

**API:** `createStore`, `dispatch`, `select`. Persist: meglévő `SESSION_KEY` localStorage.

**Hiba:** desync, async reject.

**Security:** nincs secret a persistben.

### B.13 ROUTING — P0

**Fájlok:** `route-map.js`, `protected.js`, `lazy.js`, `deep-link.js`.

**Route map (Shell, egy origin :4000):**

| path | view | protection |
|------|------|------------|
| `/` `?view=home` | home | public local |
| `?view=work\|entities\|slice\|decisions\|evidence\|jobs\|system` | existing | public local |
| `?view=engineering` | technical | disclose |
| `?view=console.admin` … `console.platform` | consoles | role-gated |

**Lazy:** P1-ben dinamikus script chunk **nem** kötelező (nincs bundler). `lazy.js` = `import()` csak ha bevezetünk buildet; addig **deferred view render** (ne mountoljon minden konzolt bootkor).

### B.14 OS SHELL — P0 (chrome, nem app)

**Fájlok a cockpitben / os-environment kiterjesztés:** `command-line.js` (cmdk már van), `process-manager.js` (supervisor status API), `system-monitor.js` (meglévő System view), `event-bus-adapter.js`.

**API:** `GET /v1/os/shell` már van.

**Tilos:** `apps/os-shell` listen külön porton.

**Hiba:** `SECOND_SHELL_AUTHORITY` detektálása (healthz service név lock).

### B.15 ADMIN CONSOLE — P2 UI / P1 API váz

**Fájlok:** `apps/admin-console` mint **library** `src/{users,roles,permissions,render}.js` + mount a cockpit view `#consoleAdmin`.

**Komponensek:** user table, role editor, permission matrix (governance MATRIX viz).

**API:** `GET/POST /v1/admin/users`, `GET/PUT /v1/admin/roles` — ALPHA in-memory. Nincs LDAP.

**Modell:** `User`, `RoleAssignment`.

**Hiba:** USER_NOT_FOUND, ROLE_CONFLICT.

**Security:** csak `admin` role; minden mutáció audit.

**AI:** nincs.

### B.16 DEVELOPER CONSOLE — P2 (Technical only)

**Fájlok:** `api-explorer.js`, `schema-viewer.js`, `mock-server-control.js`.

**API:** `GET /v1/dev/openapi` (generált a CP route listából). Mock: meglévő `apps/mock-api`.

**Security:** soha Professional default (`UXD-PRO-001`, `REJ-JSON-PRIMARY`).

### B.17 AI CENTER — P2 UI / P1 engine

**Fájlok:** `agent-control.js`, `pipeline-execution.js`, `model-insights.js`.

**API:** proposals + `GET /v1/models` + validation (már van).

**Security:** NON-PRODUCTION banner; Approve disabled ha policy reject.

**Pipeline:** grounded explain; no live money.

### B.18 OBSERVABILITY CONSOLE — P2

**Fájlok:** `log-viewer.js`, `metric-explorer.js`, `trace-map.js`.

**API:** B.10 query endpoints.

**Hiba:** NO_TELEMETRY_STORE → UNKNOWN, nem üres zöld dashboard.

### B.19 SECURITY CONSOLE — P2

**Fájlok:** `session-inspector.js`, `auth-events.js`, `permission-audit.js`.

**API:** B.11. Role: admin / risk_officer.

### B.20 OPERATIONS CONSOLE — P1 (jobs already)

**Fájlok:** kiterjeszteni a Job Center-t: `queue-monitor.js`, `scheduler.js`.

**API:** jobs élnek. Kell: `GET /v1/ops/queues`, `GET/POST /v1/ops/schedules` (in-memory cron ALPHA).

**Modell:** QueueDepth, CronSpec.

**Hiba:** QUEUE_SATURATED, SCHEDULE_INVALID.

### B.21 PLATFORM CONSOLE — P2

**Fájlok:** `service-registry.js` (os-environment), `deployment-map.js` (CP+Shell+optional compose), `environment-manager.js` (local-foundation | packaged | compose — read-only P1).

**Security:** secret redaction URLs.

---

## Hullámok (élő számok a katalógusból)

A 1000 GAP × 10 WU = 10000. W4 szándékosan vékony: OIDC/OTLP SDK/durable queue **kevés valódi hiány**, nem 3000 kitalált enterprise task. First-release nem hazudik READY-t ezekre.

| Hullám | GAP | WU | Scope | Kilépési bizonyíték |
|--------|-----|----|--------|---------------------|
| **W0** | 84 | 840 | Lock: boot, ports, GW1, design-system, jobs API, „ne forkolj”. Katalógus. | Mapping teszt + no-second-boot assertion |
| **W1** | 278 | 2780 | P0: tokens (extend design-system), ui-core/layout/nav/status/error, routing `?view=`, Shell chrome a cockpitben | Token lock teszt; History API; nincs új port |
| **W2** | 333 | 3330 | P1: workflow/AI/obs/sec/state adapter; `/v1/obs` `/v1/sec` váz; jobs kiterjesztés; GW1 regresszió | Slice + job tests zöldek |
| **W3** | 303 | 3030 | Technical consoles composed; UNKNOWN-honest empty/error/offline | Konzol view a Shellben, nem külön app |
| **W4** | 2 | 20 | P2 enterprise: OIDC, OTLP SDK, durable queue — **ABSENT/UNKNOWN** first-release-en | Nem ALPHA READY; capability registry ABSENT marad |

Finish modes: lock-existing · do-not-fork · adapter · compose-in-shell · unknown-honest · p2-enterprise.

Priority WU: **P0 3620 · P1 3330 · P2 3050**.

W0 ebben a csomagban a katalógus+lock **kész** (dokumentum). W1–W3 kód még nincs megírva — a WU-k a teendő, nem az elvégzett munka.

---

## Auditálhatóság

- Gap: `01-GAP-CATALOG.md` + `gap-catalog.json` (GAP-0001…1000)
- Work: `completion-work-units.json` (WU-00001…10000)
- Generator: `scripts/v1-command-gap-expand.cjs`
- Minden implementáció: teszt + diagnostics-export; **nincs TODO**; **nincs false READY**
