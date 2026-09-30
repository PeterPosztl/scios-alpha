#!/usr/bin/env node
/**
 * Expand V1 command-box gap catalog + completion work units.
 * ALPHA_NON_PRODUCTION — analysis artifact, not a readiness claim.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "enterprise", "v1-command-box");
fs.mkdirSync(OUT, { recursive: true });
const { enrichGaps, unitStep, SECTION_TITLE, UNIT_HELP } = require("./v1-gap-enrich.cjs");

const LABEL = "ALPHA_NON_PRODUCTION";
const AT = new Date().toISOString();

const MODULES = [
  {
    id: "ui-tokens",
    v1: "packages/ui-tokens",
    nearest: "packages/design-system",
    klass: "PARTIAL_NEAR",
    layer: "UI",
    files: [
      "color.js semantic map (risk/evidence/proposal vs done)",
      "spacing.js 4/8 density scale beyond space 1–4",
      "typography.js Suisse/SF scale + brand/body/meta/mono",
      "elevation.js Swiss-flat (radius 0) shadow tokens",
      "motion.js 120fps + 300ms macro + prefers-reduced-motion",
      "grid.js 12-col + breakpoints",
    ],
    interfaces: ["SciTokenContract", "DensityMode", "MotionBudget", "SemanticColorRole"],
    apis: ["exportCss()", "exportJs()", "assertPaletteLock()"],
    models: ["TokenManifest", "DensityScale", "ContrastPair"],
    errors: ["TOKEN_PALETTE_DRIFT", "TOKEN_CONTRAST_FAIL", "TOKEN_UNKNOWN_DENSITY"],
    logs: ["token.load", "token.drift"],
    metrics: ["token.contrast.fail_count"],
    traces: ["ux.token.resolve"],
    security: ["no vendor theme swap without UXD-COLOR-001 record"],
    pipelines: ["none — tokens are not an AI pipeline; V1 unspecified this"],
  },
  {
    id: "ui-core",
    v1: "packages/ui-core",
    nearest: "apps/cockpit-ui/src/components/primitives.js",
    klass: "PARTIAL_NEAR",
    layer: "UI",
    files: ["button.js", "input.js", "card.js", "modal.js", "panel.js", "index.js inlinable source"],
    interfaces: ["ButtonProps", "InputProps", "ModalProps", "Focusable", "ActionBoundControl"],
    apis: ["createButton", "createInput", "createCard", "createModal", "createPanel", "CORE_BROWSER_SOURCE"],
    models: ["ControlState", "ActionIdBinding"],
    errors: ["CONTROL_WITHOUT_ACTION_ID", "MODAL_FOCUS_TRAP_FAIL"],
    logs: ["ui.core.mount", "ui.core.action"],
    metrics: ["ui.core.interaction_ms"],
    traces: ["ux.control.click"],
    security: ["no secrets in input value logs; password fields never echoed"],
    pipelines: ["none"],
  },
  {
    id: "ui-layout",
    v1: "packages/ui-layout",
    nearest: "cockpit-ui CSS .grid / main max-width 1180",
    klass: "NAME_ONLY",
    layer: "UI",
    files: ["grid.js", "flex.js", "breakpoints.js", "container.js", "layout.css"],
    interfaces: ["GridSpec", "Breakpoint", "ContainerWidth", "DensityLayout"],
    apis: ["applyGrid", "applyFlex", "matchBreakpoint"],
    models: ["LayoutRegion", "PanelSlot"],
    errors: ["LAYOUT_BREAKPOINT_UNKNOWN", "LAYOUT_OVERFLOW"],
    logs: ["ui.layout.reflow"],
    metrics: ["ui.layout.reflow_ms"],
    traces: ["ux.layout.reflow"],
    security: ["layout must not leak technical ports into professional copy"],
    pipelines: ["none"],
  },
  {
    id: "ui-molecules",
    v1: "packages/ui-molecules",
    nearest: "cockpit searchwrap + homeGrid cards (ad hoc)",
    klass: "NAME_ONLY",
    layer: "UI",
    files: ["search-bar.js", "filter-bar.js", "data-row.js", "info-tile.js"],
    interfaces: ["SearchBarProps", "FilterBarProps", "DataRowProps", "InfoTileProps"],
    apis: ["createSearchBar", "createFilterBar", "createDataRow", "createInfoTile"],
    models: ["SearchQuery", "FilterClause", "RowIdentity"],
    errors: ["SEARCH_EMPTY", "FILTER_INVALID", "ROW_IDENTITY_MISSING"],
    logs: ["ui.search.submit", "ui.filter.change"],
    metrics: ["ui.search.latency_ms", "ui.filter.result_count"],
    traces: ["ux.search"],
    security: ["search query redaction for secrets"],
    pipelines: ["search → /v1/search already exists; molecule not bound"],
  },
  {
    id: "ui-organisms",
    v1: "packages/ui-organisms",
    nearest: "cockpit views home/slice/evidence (monolith HTML)",
    klass: "UNWIRED",
    layer: "UI",
    files: ["dashboard.js", "table.js", "form-engine.js", "detail-view.js"],
    interfaces: ["DashboardSpec", "TableColumn", "FormSchema", "DetailViewSpec"],
    apis: ["createDashboard", "createTable", "createFormEngine", "createDetailView"],
    models: ["FormField", "TableSort", "DashboardWidget"],
    errors: ["FORM_VALIDATION", "TABLE_EMPTY", "DETAIL_OBJECT_UNKNOWN"],
    logs: ["ui.form.submit", "ui.table.sort"],
    metrics: ["ui.form.validation_fail", "ui.table.render_ms"],
    traces: ["ux.form.submit"],
    security: ["form fields classified; no uncontrolled HTML"],
    pipelines: ["form submit → Action contract missing for most consoles"],
  },
  {
    id: "ui-navigation",
    v1: "packages/ui-navigation",
    nearest: "cockpit nav.primary + command palette (no sidebar, no breadcrumbs, no URL router)",
    klass: "PARTIAL_NEAR",
    layer: "UI",
    files: ["sidebar.js", "topbar.js", "breadcrumbs.js", "router-bridge.js"],
    interfaces: ["NavItem", "Breadcrumb", "ShellChrome"],
    apis: ["createSidebar", "createTopbar", "createBreadcrumbs", "bindRouter"],
    models: ["NavTree", "DeepLink"],
    errors: ["NAV_UNKNOWN_VIEW", "NAV_PROTECTED_DENIED"],
    logs: ["ui.nav.change"],
    metrics: ["ui.nav.view_change_count"],
    traces: ["ux.nav"],
    security: ["protected nav items honor session role"],
    pipelines: ["none"],
  },
  {
    id: "ui-status",
    v1: "packages/ui-status",
    nearest: "cockpit badges ok/warn/err + UNKNOWN copy (ad hoc)",
    klass: "PARTIAL_NEAR",
    layer: "UI",
    files: ["loading.js", "success.js", "warning.js", "error.js", "offline.js", "unknown.js"],
    interfaces: ["StatusKind", "StatusView"],
    apis: ["createStatus", "mapVerdictToStatus"],
    models: ["DimensionalStatus"],
    errors: ["STATUS_COLLAPSED_TO_SINGLE_READY"],
    logs: ["ui.status.paint"],
    metrics: ["ui.status.unknown_count"],
    traces: ["ux.status"],
    security: ["never paint READY without evidence"],
    pipelines: ["none"],
  },
  {
    id: "ui-error-loading",
    v1: "packages/ui-error-loading",
    nearest: "banner + createErrorState primitive; no React error boundary (vanilla shell)",
    klass: "PARTIAL_NEAR",
    layer: "UI",
    files: ["global-error-boundary.js", "global-loading-overlay.js", "retry.js"],
    interfaces: ["ErrorBoundary", "RetryPolicy", "LoadingOverlay"],
    apis: ["installGlobalErrorHandler", "showLoadingOverlay", "retryWithBackoff"],
    models: ["UiFailure", "RetryAttempt"],
    errors: ["UNCAUGHT_UI", "RETRY_EXHAUSTED", "OVERLAY_DEADLOCK"],
    logs: ["ui.crash", "ui.retry"],
    metrics: ["ui.crash.count", "ui.retry.success_ratio"],
    traces: ["ux.retry"],
    security: ["crash reports must redact"],
    pipelines: ["none"],
  },
  {
    id: "workflow-engine",
    v1: "packages/workflow-engine",
    nearest: "vertical-slice stages + job TRANSITION_MATRIX in osSession.ts",
    klass: "PARTIAL_NEAR",
    layer: "ENGINE",
    files: ["machine.js", "transitions.js", "guards.js", "effects.js", "audit.js"],
    interfaces: ["StateMachine", "Guard", "Effect", "WorkflowAudit"],
    apis: ["defineMachine", "transition", "canTransition", "runEffect"],
    models: ["WorkflowInstance", "TransitionEvent", "GuardResult"],
    errors: ["ILLEGAL_TRANSITION", "GUARD_REJECT", "EFFECT_FAIL"],
    logs: ["wf.transition", "wf.guard.reject"],
    metrics: ["wf.illegal_transition", "wf.duration_ms"],
    traces: ["wf.run"],
    security: ["effects go through Action + governance"],
    pipelines: ["GW1 slice stages exist; generic workflow package does not"],
  },
  {
    id: "ai-engine",
    v1: "packages/ai-engine",
    nearest: "model-registry + meta-intelligence + cockpit AI context panel (explain-only)",
    klass: "PARTIAL_NEAR",
    layer: "ENGINE",
    files: ["command-center.js", "agent-manager.js", "pipeline-manager.js", "model-registry-adapter.js"],
    interfaces: ["Agent", "AiPipeline", "ModelRef", "Proposal"],
    apis: ["registerAgent", "runPipeline", "listModels", "proposeAction"],
    models: ["AgentCard", "PipelineRun", "Citation"],
    errors: ["AGENT_UNGOVERNED", "PIPELINE_UNGROUNDED", "MODEL_NON_PRODUCTION"],
    logs: ["ai.propose", "ai.pipeline.start"],
    metrics: ["ai.proposal_count", "ai.ungrounded_reject"],
    traces: ["ai.pipeline"],
    security: ["GOVERNANCE > AGENT; no auto-execute"],
    pipelines: ["GW1 in-process baseline-logistic; no LLM pipeline; OPENAI optional unused for GW1"],
  },
  {
    id: "observability-engine",
    v1: "packages/observability-engine",
    nearest: "packages/observability (logger+in-memory metrics+event bus) + otelHealth probe",
    klass: "PARTIAL_NEAR",
    layer: "ENGINE",
    files: ["logs.ts", "metrics.ts", "traces.ts", "dashboards.ts"],
    interfaces: ["LogRecord", "MetricInstrument", "Span", "DashboardSpec"],
    apis: ["queryLogs", "queryMetrics", "queryTraces", "exportOtlp"],
    models: ["CorrelationId", "TraceContext"],
    errors: ["OTEL_NOT_CONFIGURED", "METRIC_UNBOUNDED_MEMORY"],
    logs: ["obs.self"],
    metrics: ["obs.export.fail"],
    traces: ["obs.export"],
    security: ["redact secrets — already partial in redactLogMeta"],
    pipelines: ["no trace pipeline; OTEL is health probe not SDK export"],
  },
  {
    id: "security-engine",
    v1: "packages/security-engine",
    nearest: "governance-engine 4-role matrix + AUTH_MODE=local-development",
    klass: "PARTIAL_NEAR",
    layer: "ENGINE",
    files: ["auth.js", "roles.js", "permissions.js", "session-manager.js"],
    interfaces: ["Authenticator", "RoleBinding", "Permission", "Session"],
    apis: ["login", "logout", "authorize", "inspectSession"],
    models: ["Principal", "SessionRecord", "AuthEvent"],
    errors: ["AUTH_REQUIRED", "PERMISSION_DENIED", "SESSION_EXPIRED"],
    logs: ["sec.auth", "sec.deny"],
    metrics: ["sec.deny.count"],
    traces: ["sec.authorize"],
    security: ["OIDC ABSENT; no CSRF/session cookies; loopback only"],
    pipelines: ["none"],
  },
  {
    id: "state-engine",
    v1: "packages/state-engine",
    nearest: "cockpit lastData + localStorage session; CP in-memory Maps",
    klass: "NAME_ONLY",
    layer: "ENGINE",
    files: ["store.js", "selectors.js", "reducers.js", "async.js"],
    interfaces: ["Store", "Selector", "Reducer", "AsyncAction"],
    apis: ["createStore", "select", "dispatch", "dispatchAsync"],
    models: ["AppState", "ActionEnvelope"],
    errors: ["STATE_DESYNC", "ASYNC_REJECT"],
    logs: ["state.dispatch"],
    metrics: ["state.dispatch.count"],
    traces: ["state.async"],
    security: ["no secrets in persisted state"],
    pipelines: ["none"],
  },
  {
    id: "routing",
    v1: "packages/routing",
    nearest: "showView() in-memory; no History API; no protected routes; no lazy load (monolith HTML)",
    klass: "NAME_ONLY",
    layer: "ENGINE",
    files: ["route-map.js", "protected.js", "lazy.js", "deep-link.js"],
    interfaces: ["Route", "Guard", "LazyView"],
    apis: ["navigate", "parseDeepLink", "protect"],
    models: ["RouteMap", "Location"],
    errors: ["ROUTE_NOT_FOUND", "ROUTE_FORBIDDEN"],
    logs: ["route.change"],
    metrics: ["route.404"],
    traces: ["route.navigate"],
    security: ["protected routes require session"],
    pipelines: ["none"],
  },
  {
    id: "os-shell",
    v1: "apps/os-shell",
    nearest: "apps/cockpit-ui IS AppHost (ADR-SHELL-001); packages/os-environment registries",
    klass: "PARTIAL_NEAR",
    layer: "APP",
    files: ["command-line.js", "process-manager.js", "system-monitor.js", "event-bus-adapter.js"],
    interfaces: ["ShellCommand", "ProcessHandle", "MonitorSnapshot"],
    apis: ["GET /v1/os/shell already exists; V1 asked a second app"],
    models: ["ShellRegistry", "ProcessTable"],
    errors: ["SECOND_SHELL_AUTHORITY", "PROCESS_UNKNOWN"],
    logs: ["shell.cmd"],
    metrics: ["shell.cmd.count"],
    traces: ["shell.cmd"],
    security: ["CLI must not bypass governance"],
    pipelines: ["none"],
  },
  {
    id: "admin-console",
    v1: "apps/admin-console",
    nearest: "governance can(manage_users) with no UI and no user store",
    klass: "ABSENT",
    layer: "APP",
    files: ["user-management.js", "role-editor.js", "permission-matrix.js"],
    interfaces: ["UserRecord", "RoleEditor", "PermissionMatrix"],
    apis: ["GET/POST /v1/admin/users ABSENT", "GET/PUT /v1/admin/roles ABSENT"],
    models: ["User", "RoleAssignment"],
    errors: ["USER_NOT_FOUND", "ROLE_CONFLICT"],
    logs: ["admin.user.change"],
    metrics: ["admin.user.count"],
    traces: ["admin.mutate"],
    security: ["admin mutations require admin role + audit"],
    pipelines: ["none"],
  },
  {
    id: "developer-console",
    v1: "apps/developer-console",
    nearest: "apps/mock-api + engineering view JSON; no API explorer/schema viewer product",
    klass: "ABSENT",
    layer: "APP",
    files: ["api-explorer.js", "schema-viewer.js", "mock-server-control.js"],
    interfaces: ["OpenApiDoc", "SchemaNode", "MockControl"],
    apis: ["GET /v1/dev/openapi ABSENT"],
    models: ["Endpoint", "SchemaRef"],
    errors: ["SCHEMA_UNAVAILABLE", "MOCK_NOT_RUNNING"],
    logs: ["dev.explore"],
    metrics: ["dev.explore.count"],
    traces: ["dev.request"],
    security: ["dev console Technical-only; not Professional default"],
    pipelines: ["none"],
  },
  {
    id: "ai-center",
    v1: "apps/ai-center",
    nearest: "cockpit ai-panel + /v1/models; no agent control / pipeline execution UI",
    klass: "ABSENT",
    layer: "APP",
    files: ["agent-control.js", "pipeline-execution.js", "model-insights.js"],
    interfaces: ["AgentControl", "PipelineView", "ModelInsight"],
    apis: ["POST /v1/ai/pipelines ABSENT"],
    models: ["PipelineRunView"],
    errors: ["PIPELINE_NOT_FOUND", "AGENT_DISABLED_BY_POLICY"],
    logs: ["ai.center.run"],
    metrics: ["ai.center.run.count"],
    traces: ["ai.center"],
    security: ["proposals ≠ execution; NON-PRODUCTION model banner required"],
    pipelines: ["must cite; must not auto-act"],
  },
  {
    id: "observability-console",
    v1: "apps/observability-console",
    nearest: "/v1/observability/health JSON; System view cards; no log viewer/metric explorer/trace map",
    klass: "ABSENT",
    layer: "APP",
    files: ["log-viewer.js", "metric-explorer.js", "trace-map.js"],
    interfaces: ["LogQuery", "MetricQuery", "TraceMap"],
    apis: ["GET /v1/obs/logs ABSENT", "GET /v1/obs/metrics ABSENT", "GET /v1/obs/traces ABSENT"],
    models: ["LogHit", "MetricSeries", "SpanNode"],
    errors: ["QUERY_TOO_BROAD", "NO_TELEMETRY_STORE"],
    logs: ["obs.console.query"],
    metrics: ["obs.console.query_ms"],
    traces: ["obs.console"],
    security: ["logs redacted; RBAC on traces"],
    pipelines: ["none"],
  },
  {
    id: "security-console",
    v1: "apps/security-console",
    nearest: "GET /v1/governance/can; in-memory audit log; no session inspector UI",
    klass: "ABSENT",
    layer: "APP",
    files: ["session-inspector.js", "auth-events.js", "permission-audit.js"],
    interfaces: ["SessionInspector", "AuthEventList", "PermissionAudit"],
    apis: ["GET /v1/sec/sessions ABSENT", "GET /v1/sec/auth-events ABSENT"],
    models: ["AuthEventView"],
    errors: ["SESSION_INSPECT_DENIED"],
    logs: ["sec.console.inspect"],
    metrics: ["sec.console.inspect.count"],
    traces: ["sec.console"],
    security: ["only admin/risk_officer"],
    pipelines: ["none"],
  },
  {
    id: "operations-console",
    v1: "apps/operations-console",
    nearest: "Job Center view + /v1/os/jobs CF11; no queue monitor; no scheduler",
    klass: "PARTIAL_NEAR",
    layer: "APP",
    files: ["job-manager.js", "queue-monitor.js", "scheduler.js"],
    interfaces: ["JobManager", "QueueSnapshot", "Schedule"],
    apis: ["jobs APIs exist; queue/scheduler APIs ABSENT"],
    models: ["QueueDepth", "CronSpec"],
    errors: ["QUEUE_SATURATED", "SCHEDULE_INVALID"],
    logs: ["ops.job", "ops.schedule"],
    metrics: ["ops.queue.depth"],
    traces: ["ops.job"],
    security: ["job cancel requires permission"],
    pipelines: ["foundation-smoke-worker in-process only"],
  },
  {
    id: "platform-console",
    v1: "apps/platform-console",
    nearest: "os-environment service registry JSON; no deployment map UI; no env manager",
    klass: "ABSENT",
    layer: "APP",
    files: ["service-registry.js", "deployment-map.js", "environment-manager.js"],
    interfaces: ["ServiceRecord", "DeploymentNode", "Environment"],
    apis: ["GET /v1/platform/services ABSENT as console API"],
    models: ["EnvironmentName", "DeployUnit"],
    errors: ["ENV_UNKNOWN", "DEPLOY_MAP_STALE"],
    logs: ["plat.env.change"],
    metrics: ["plat.service.count"],
    traces: ["plat.console"],
    security: ["env manager must not expose secrets in UI"],
    pipelines: ["none"],
  },
  {
    id: "v1-spec-meta",
    v1: "(the command box itself)",
    nearest: "docs/enterprise/* already specify a different OS",
    klass: "UNSPECIFIED",
    layer: "SPEC",
    files: ["no architecture diagram", "no sequence diagrams", "no API catalog", "no data dictionary"],
    interfaces: ["no engine contracts", "no event types", "no error taxonomy"],
    apis: ["zero endpoints named", "no versioning", "no idempotency keys"],
    models: ["zero Zod/JSON schemas", "no identity model", "no tenancy"],
    errors: ["no failure modes", "no degraded matrix", "no retry/backoff"],
    logs: ["no log schema", "no correlation", "no retention"],
    metrics: ["no SLO", "no RED/USE", "no cardinality rules"],
    traces: ["no span names", "no baggage", "no sampling"],
    security: ["no threat model", "no authN/Z", "no data class"],
    pipelines: ["AI named only as folders", "no prompts", "no citation protocol"],
  },
  {
    id: "integration-existing",
    v1: "V1 vs scios-alpha truth",
    nearest: "cockpit-ui + control-plane-api + start-sci-os",
    klass: "UNWIRED",
    layer: "PLATFORM",
    files: ["no mapping table V1→existing", "would create parallel apps/* HTTP servers"],
    interfaces: ["conflicts ADR-SHELL-001", "conflicts REJ-200-APPS", "conflicts ONE CANONICAL BOOT"],
    apis: ["canonical ports 3000/4000 unspecified in V1", "V1 implies many consoles = many ports"],
    models: ["SCI object model unused by V1", "PredictionEnvelope unused", "RiskEnvelope unused"],
    errors: ["false READY if folders exist", "boot fork risk"],
    logs: ["two log dialects if parallel OS"],
    metrics: ["split brain health"],
    traces: ["no shared correlation with GW1"],
    security: ["AUTH_MODE local-development ignored by V1"],
    pipelines: ["GW1 spine ignored by V1 folder list"],
  },
];

const DIMS = [
  ["files", "FILES", "concrete files"],
  ["interfaces", "INTERFACES", "typed contracts"],
  ["apis", "APIS", "callable APIs"],
  ["models", "MODELS", "data models"],
  ["errors", "ERRORS", "error handling"],
  ["logs", "LOGS", "logging"],
  ["metrics", "METRICS", "metrics"],
  ["traces", "TRACES", "traces"],
  ["security", "SECURITY", "security policy"],
  ["pipelines", "PIPELINES", "AI/workflow pipelines"],
];

const STRUCTURAL = [
  ["1.1", "FOLDERSTRUKTÚRA", "V1 8 apps + 16 packages nincsenek a fán — és nem is szabad HTTP-appként létrehozni őket", "A V1 mappa = második OS illúziója; a user a Shellben keresi a képességet, a risk a split-brain boot", "Mapping lock: V1 név → cockpit view vagy CP route. Élő fa marad apps/cockpit-ui + control-plane-api", "repo"],
  ["1.2", "PACKAGES", "Nincs @scios/ui-tokens…routing package a workspace-ben; a V1 nevek 0 package.json", "Ha üres csomagokat gyártunk, pnpm build hamis zöldet ad képesség nélkül", "Tokenek a design-system kiterjesztése; UI inlinable a cockpitbe; engine = adapter a meglévő package-re", "packages"],
  ["1.3", "APPS", "8 konzol-app 0; élő apps: cockpit-ui, control-plane-api, prediction/risk/execution, mock-api", "8 HTTP shell sértené REJ-200-APPS és ADR-SHELL-001; operator/engineer nem kap Technical workspace-t a Shellben", "Console modules: cockpit data-v + os-environment registry, :4000 only", "apps"],
  ["1.4", "ENGINEK", "V1 6 új engine-név; élő: governance-engine, observability, vertical-slice, model-registry, osSession jobs", "Második workflow/AI authority eltöri a GW1 spinet", "Adapter façade, nem új pipeline", "engine"],
  ["1.5", "UI RÉTEGEK", "Nincs tokens→core→layout→molecules→organisms szétválasztás; cockpit ~1530 sor monolith", "Professional UI nem reuse-olható; Technical konzolok ad hoc CSS-t kapnának", "Inlinable @scios/ui-* + token lock, AppHost marad cockpit-ui", "UI"],
  ["1.6", "WORKFLOW", "Nincs generic workflow-engine csomag; van GW1 11 stage + CF11 TRANSITION_MATRIX", "Párhuzamos state machine = illegal transition / duplicate side effect", "workflow-engine adapter a slice+jobs fölött", "workflow"],
  ["1.7", "KONZOLOK", "Admin/Dev/AI/Obs/Sec/Ops/Platform nézet nincs a Shellben", "Admin nem kezel usert; engineer nem néz trace-t; operator nem lát queue-t — Technical path lyukas", "Composed Technical workspaces, UNKNOWN-honest empty", "console"],
  ["1.8", "SHELL", "V1 apps/os-shell mint második AppHost", "Két Shell, két port, két healthz = split brain; minden user érintett", "Chrome (cmdk már van, URL/sidebar/breadcrumb hiány) a cockpit-ui-ban; GET /v1/os/shell él", "shell"],
  ["1.9", "OBSERVABILITY", "Nincs log viewer / metric explorer / trace map; van logger + otelHealth probe", "Operator vak; health JSON ≠ observatory; risk: unredacted secrets ha naivan dump", "GET /v1/obs/* in-memory + Technical view; OTLP SDK = W4", "obs"],
  ["1.10", "SECURITY", "Nincs user store, session inspector UI, OIDC; van 4-role matrix + AUTH_MODE=local-development", "Mindenki operator; mutations nincsenek principalhoz kötve; OIDC first-release-nek hazugság lenne", "ALPHA: session+deny audit (W2). OIDC = W4 p2-enterprise, UNKNOWN until chosen", "sec"],
  ["1.11", "AI", "Nincs agent manager / pipeline runner UI; van model-registry + explain panel", "Ungoverned agent = side effect governance nélkül; Professional user proposal-t vár, nem autonóm act-et", "ai-engine adapter: Proposal+citation; GW1 baseline-logistic érintetlen", "ai"],
  ["1.12", "OPERATIONS", "Nincs queue monitor / scheduler; van Job Center + /v1/os/jobs CF11", "Operator nem lát depth-et; durable BullMQ = W4 nem P0", "Extend jobs API; in-memory schedule ALPHA; durable queue UNKNOWN", "ops"],
  ["1.13", "PLATFORM", "Nincs deployment map / env manager UI; van os-environment service registry JSON + infra/docker compose", "Platform operator nem lát env-t a Shellben; V1 nem ismerte a local-foundation profilt", "Read-only env view W3; write/multi-env W4", "plat"],
];

const SYSTEM = [
  ["3.1", "ARCHITEKTÚRA DIAGRAM", "V1 nem ad layer/sequence/deployment diagramot", "Építés irány nélkül", "Egy ábra: Boot→CP:3000→Shell:4000→engines→composed consoles", "arch"],
  ["3.2", "LIFECYCLE", "nincs install/boot/ready/degraded/shutdown/reboot a V1-ben", "Már van start-sci-os; V1 ignorálja", "Megtartani kanonikus bootot", "boot"],
  ["3.3", "FAILURE-MODE", "nincs NO_GO vs OPTIONAL_INFRA_DEGRADED", "Hamis total failure vagy hamis READY", "Dimensional status", "fail"],
  ["3.4", "OBS STRATÉGIA", "V1 szavak: logs/metrics/traces/dashboards", "Nincs store, retention, PII, SLO", "Local first + optional OTLP", "obs"],
  ["3.5", "SECURITY MODELL", "auth/roles/permissions/session felsorolva", "Nincs threat model, tenancy, secrets", "AUTH_MODE ladder", "sec"],
  ["3.6", "AI INTEGRÁCIÓ", "command center/agent/pipeline/model registry szavak", "Nincs citation, grounding, GOVERNANCE>AGENT", "Swiss Evidence Protocol + proposal badge", "ai"],
  ["3.7", "OPS PLAYBOOK", "job/queue/scheduler szavak", "Nincs on-call, runbook, backup", "CF11 + repair/safe modes already exist — document don't fork", "ops"],
  ["3.8", "PLATFORM STRATÉGIA", "service/deploy/env szavak", "Nincs k8s/compose contract in V1; compose már van infra/docker", "Extend, don't replace", "plat"],
];

const V1_FOLDERS = [
  "apps/os-shell",
  "apps/admin-console",
  "apps/developer-console",
  "apps/ai-center",
  "apps/observability-console",
  "apps/security-console",
  "apps/operations-console",
  "apps/platform-console",
  "packages/ui-tokens",
  "packages/ui-core",
  "packages/ui-layout",
  "packages/ui-molecules",
  "packages/ui-organisms",
  "packages/ui-navigation",
  "packages/ui-status",
  "packages/ui-error-loading",
  "packages/workflow-engine",
  "packages/ai-engine",
  "packages/observability-engine",
  "packages/security-engine",
  "packages/state-engine",
  "packages/routing",
];

const SCAFFOLD = [
  "package.json with name @scios/<id>, type module, label ALPHA_NON_PRODUCTION",
  "src/index.js public exports (no empty barrel)",
  "src/<id>.test.js or .test.ts targeted proof",
  "README.md contract: owner, nearest existing authority, non-goals",
  "jsconfig/tsconfig aligned to tsconfig.base.json",
];

const RESOURCES = [
  ["users", "admin"],
  ["roles", "admin"],
  ["permissions", "admin"],
  ["sessions", "security"],
  ["auth-events", "security"],
  ["agents", "ai"],
  ["pipelines", "ai"],
  ["models", "ai"],
  ["logs", "obs"],
  ["metrics", "obs"],
  ["traces", "obs"],
  ["jobs", "ops"],
  ["queues", "ops"],
  ["schedules", "ops"],
  ["services", "platform"],
  ["deployments", "platform"],
  ["environments", "platform"],
  ["routes", "routing"],
  ["workflows", "workflow"],
  ["commands", "shell"],
];

const VERBS = ["GET list", "GET by id", "POST create", "PATCH update", "DELETE/disable"];

const EVENTS = [
  "sci.ui.view.changed",
  "sci.ui.command.invoked",
  "sci.wf.transitioned",
  "sci.wf.guard.rejected",
  "sci.ai.proposal.created",
  "sci.ai.pipeline.started",
  "sci.ai.pipeline.completed",
  "sci.sec.auth.succeeded",
  "sci.sec.auth.failed",
  "sci.sec.permission.denied",
  "sci.ops.job.queued",
  "sci.ops.job.failed",
  "sci.obs.export.failed",
  "sci.plat.env.changed",
  "sci.shell.process.exited",
];

const FAILURES = [
  "CONTROL_PLANE_UNREACHABLE → Shell DEGRADED, Home still paints",
  "OPTIONAL_PG_ABSENT → OPTIONAL_INFRA_DEGRADED not NO_GO",
  "OTEL_COLLECTOR_DOWN → local logs continue; obs console UNKNOWN",
  "AUTH_SESSION_EXPIRED → protected route hold, not blank crash",
  "JOB_ILLEGAL_TRANSITION → 409 + audit",
  "AGENT_POLICY_DENY → proposal retained, no side effect",
  "TOKEN_PALETTE_DRIFT → gate fail, do not ship",
  "SECOND_BOOT_DETECTED → refuse, keep start-sci-os",
  "MODEL_UNVALIDATED → NON-PRODUCTION banner required",
  "LINEAGE_HASH_MISMATCH → evidence UNKNOWN not PASS",
];

const WORK_UNITS = [
  ["U1", "SPEC", "Contract/spec sentence in package README + product-memory if protected"],
  ["U2", "FILE", "Create the source file (no empty stub, no TODO)"],
  ["U3", "INTERFACE", "Export typed or JSDoc public interface"],
  ["U4", "IMPLEMENT", "Working ALPHA behavior with honest UNKNOWN/DEGRADED"],
  ["U5", "WIRE", "Bind to cockpit AppHost and/or control-plane route"],
  ["U6", "ERROR", "Typed error + UI/API failure path + retry if user-facing"],
  ["U7", "O11Y", "Structured log + metric and/or trace field"],
  ["U8", "TEST", "Targeted unit or contract test; fail closed on missing evidence"],
  ["U9", "PROOF", "diagnostics-export artifact; no false READY"],
  ["U10", "GATE", "Wire into an existing gate or a new scoped proof script"],
];

function why(mod, dim) {
  return `${mod.v1} ${dim} missing or unspecified in V1; nearest=${mod.nearest}; class=${mod.klass}`;
}

function should(item, dimName) {
  return `Working ${dimName}: ${item} — labeled ${LABEL}, composed into Shell :4000 / CP :3000, never a second boot.`;
}

const gaps = [];
let n = 0;

for (const [code, title, missing, problem, shouldSee, layer] of STRUCTURAL) {
  n += 1;
  gaps.push({
    id: `GAP-${String(n).padStart(4, "0")}`,
    section: code,
    title,
    missing,
    why: problem,
    shouldSee,
    layer,
    module: "structural",
    klass: "UNSPECIFIED",
  });
}

for (const mod of MODULES) {
  for (const [key, dimName, human] of DIMS) {
    const items = Array.isArray(mod[key]) ? mod[key] : [String(mod[key])];
    for (const item of items) {
      n += 1;
      gaps.push({
        id: `GAP-${String(n).padStart(4, "0")}`,
        section: `2.${human}`,
        title: `${mod.id} / ${dimName}`,
        missing: String(item),
        why: why(mod, human),
        shouldSee: should(item, dimName),
        layer: mod.layer,
        module: mod.id,
        klass: mod.klass,
        v1Path: mod.v1,
        nearest: mod.nearest,
      });
    }
  }
}

for (const [code, title, missing, problem, shouldSee, layer] of SYSTEM) {
  n += 1;
  gaps.push({
    id: `GAP-${String(n).padStart(4, "0")}`,
    section: code,
    title,
    missing,
    why: problem,
    shouldSee,
    layer,
    module: "system",
    klass: "UNSPECIFIED",
  });
}

function pushGap(partial) {
  n += 1;
  gaps.push({
    id: `GAP-${String(n).padStart(4, "0")}`,
    klass: partial.klass || "ABSENT",
    ...partial,
  });
}

for (const folder of V1_FOLDERS) {
  for (const sc of SCAFFOLD) {
    pushGap({
      section: "1.1",
      title: "FOLDER SCAFFOLD",
      module: folder,
      layer: "repo",
      missing: `${folder} missing ${sc}`,
      why: "V1 named the folder but specified no package contract; pnpm cannot build a missing package",
      shouldSee: `${folder}/${sc} present, ALPHA labeled, composed — not a second boot`,
      klass: "ABSENT",
    });
  }
}

for (const [resource, owner] of RESOURCES) {
  for (const verb of VERBS) {
    pushGap({
      section: "2.3",
      title: "REST RESOURCE",
      module: owner,
      layer: "API",
      missing: `${verb} /v1/${owner}/${resource}`,
      why: "V1 named consoles without a single HTTP contract; Control Plane is the product API authority",
      shouldSee: `Control Plane ${verb} /v1/${owner}/${resource} with Zod body, correlation id, policy check, ALPHA label`,
      klass: "ABSENT",
    });
  }
}

for (const ev of EVENTS) {
  pushGap({
    section: "2.2",
    title: "EVENT TYPE",
    module: "observability-engine",
    layer: "ENGINE",
    missing: `EventEnvelope type ${ev} not registered on EventBus`,
    why: "InMemoryEventBus exists but V1 did not name event types; engines cannot subscribe",
    shouldSee: `${ev} in a versioned event catalog with producer, payload schema, classification`,
    klass: "UNSPECIFIED",
  });
}

for (const fail of FAILURES) {
  pushGap({
    section: "3.3",
    title: "FAILURE MODE",
    module: "system",
    layer: "fail",
    missing: fail,
    why: "V1 has zero failure-mode matrix; operators cannot tell DEGRADED from NO_GO",
    shouldSee: "Documented + implemented dimensional failure with evidence artifact",
    klass: "UNSPECIFIED",
  });
}

const HTTP_FAIL = ["401 unauthenticated", "403 forbidden", "404 not found", "409 conflict", "429 throttled", "503 degraded"];
for (const [resource, owner] of RESOURCES) {
  for (const code of HTTP_FAIL) {
    pushGap({
      section: "2.5",
      title: "API ERROR CONTRACT",
      module: owner,
      layer: "API",
      missing: `/v1/${owner}/${resource} missing ${code} envelope`,
      why: "V1 named no error taxonomy; clients cannot distinguish deny vs missing vs degraded",
      shouldSee: `JSON { error, code, correlationId, retryable, evidence } for ${code}`,
      klass: "UNSPECIFIED",
    });
  }
}

const GW1_STAGES = [
  "raw_event",
  "normalized_event",
  "pit_feature",
  "baseline_prediction",
  "calibration_uncertainty",
  "independent_risk_gate",
  "governance_decision",
  "deterministic_execution",
  "outcome",
  "immutable_lineage",
  "cockpit_view",
];
const STAGE_CONTRACTS = [
  "guard predicate",
  "effect/handler",
  "audit event",
  "timeout + retry",
  "compensation on fail",
  "span name",
  "Professional copy (not port names)",
];
for (const stage of GW1_STAGES) {
  for (const c of STAGE_CONTRACTS) {
    pushGap({
      section: "1.6",
      title: "WORKFLOW STAGE CONTRACT",
      module: "workflow-engine",
      layer: "ENGINE",
      missing: `V1 workflow-engine does not specify ${c} for GW1 stage ${stage}`,
      why: "V1 asked for a generic state machine while SCI OS already has a canonical 11-stage spine; a parallel machine would split authority",
      shouldSee: `workflow-engine adapter: ${stage}.${c} delegates to vertical-slice, never a second pipeline`,
      klass: "UNWIRED",
    });
  }
}

const CONSOLES = [
  "admin-console",
  "developer-console",
  "ai-center",
  "observability-console",
  "security-console",
  "operations-console",
  "platform-console",
  "os-shell",
];
const UI_STATES = ["loading overlay", "empty state", "error + retry", "offline", "UNKNOWN (no evidence)", "PARTIAL/degraded banner"];
for (const c of CONSOLES) {
  for (const st of UI_STATES) {
    pushGap({
      section: "2.1",
      title: "CONSOLE UI STATE",
      module: c,
      layer: "APP",
      missing: `${c} has no ${st}`,
      why: "V1 listed consoles without states; Constitution requires no dead-end and clear degraded",
      shouldSee: `${c} implements ${st} using ui-status / ui-error-loading, Professional vs Technical disclosure`,
      klass: "ABSENT",
    });
  }
}

pushGap({
  section: "3.1",
  title: "V1 VS TRUTH",
  module: "integration-existing",
  layer: "PLATFORM",
  missing: "V1 command box never names start-sci-os, ports 3000/4000, SIMULATION_ONLY, or local-foundation",
  why: "Building V1 as written would fork boot authority",
  shouldSee: "V2 completion plan binds every module to canonical boot and ports",
  klass: "UNSPECIFIED",
});
pushGap({
  section: "3.1",
  title: "V1 VS COMPOSITION",
  module: "integration-existing",
  layer: "PLATFORM",
  missing: "V1 asks for 8 apps; Product Memory forbids 200 apps and a second AppHost",
  why: "Literal implementation violates REJ-200-APPS and ADR-SHELL-001",
  shouldSee: "Consoles as composed Technical workspaces inside cockpit-ui",
  klass: "UNSPECIFIED",
});

enrichGaps(gaps);

const units = [];
let u = 0;
for (const g of gaps) {
  for (const [uid, name, desc] of WORK_UNITS) {
    u += 1;
    units.push({
      id: `WU-${String(u).padStart(5, "0")}`,
      gapId: g.id,
      unit: uid,
      unitName: name,
      wave: g.wave,
      priority: g.priority,
      finishMode: g.finishMode,
      step: unitStep(g, uid, name, desc),
      help: UNIT_HELP[uid],
      dependsOn: uid === "U1" ? [] : [`${g.id}/U${Number(uid.slice(1)) - 1}`],
      layer: g.layer,
      module: g.module,
      user: g.user,
      risk: g.risk,
    });
  }
}

const catalog = {
  schema: "sci-os-v1-command-gap-catalog/v1",
  label: LABEL,
  at: AT,
  methodology: {
    honesty:
      "V1 folder absence is NOT a task to mkdir a second app. Each atom is a live-OS hole (code/UI/API/model/policy/pipeline) or a lock against forking boot/Shell. FinishMode says how to attach it: lock-existing | do-not-fork | adapter | compose-in-shell | unknown-honest | p2-enterprise. 1000 atoms × 10 closable steps (SPEC→GATE) = 10000 WUs. Not a READY score.",
    gapCount: gaps.length,
    workUnitCount: units.length,
    workUnitsPerGap: WORK_UNITS.length,
    modules: MODULES.length,
    dimensions: DIMS.length,
  },
  v1Requested: {
    apps: [
      "os-shell",
      "admin-console",
      "developer-console",
      "ai-center",
      "observability-console",
      "security-console",
      "operations-console",
      "platform-console",
    ],
    packages: [
      "ui-tokens",
      "ui-core",
      "ui-layout",
      "ui-molecules",
      "ui-organisms",
      "ui-navigation",
      "ui-status",
      "ui-error-loading",
      "workflow-engine",
      "ai-engine",
      "observability-engine",
      "security-engine",
      "state-engine",
      "routing",
    ],
    presentOnDisk: 0,
  },
  existingTruth: {
    apps: [
      "cockpit-ui",
      "control-plane-api",
      "execution-simulator",
      "prediction-engine",
      "risk-engine",
      "mock-api",
      "meta-recovery-control-plane",
    ],
    packagesSample: [
      "design-system",
      "observability",
      "governance-engine",
      "model-registry",
      "os-environment",
      "product-kernel",
      "vertical-slice",
    ],
    boot: "installer/scripts/start-sci-os.cjs",
    ports: { controlPlane: 3000, shell: 4000 },
    authMode: "local-development",
    executionMode: "SIMULATION_ONLY",
    productLabel: LABEL,
  },
  contractConflicts: [
    "PCT-ROLE-COMPOSITION / REJ-200-APPS — 8 console apps as separate products",
    "ADR-SHELL-001 — apps/os-shell as second AppHost",
    "ADR-BOOT-001 — any new start-* claiming OS boot",
    "PCT-DESIGN-TOKENS — ui-tokens must not replace design-system palette",
    "PCT-PORTS — V1 silent on 3000/4000",
    "UXD-PRO-001 — developer consoles must not become Professional default",
    "REJ-AGENT-SWARM — unconstrained agent manager",
    "REJ-FALSE-READY — folder existence ≠ READY",
  ],
  classCounts: gaps.reduce((acc, g) => {
    acc[g.klass] = (acc[g.klass] || 0) + 1;
    return acc;
  }, {}),
  waveCounts: gaps.reduce((acc, g) => {
    acc[g.wave] = (acc[g.wave] || 0) + 1;
    return acc;
  }, {}),
  finishCounts: gaps.reduce((acc, g) => {
    acc[g.finishMode] = (acc[g.finishMode] || 0) + 1;
    return acc;
  }, {}),
  layerCounts: gaps.reduce((acc, g) => {
    acc[g.layer] = (acc[g.layer] || 0) + 1;
    return acc;
  }, {}),
  priorityCounts: gaps.reduce((acc, g) => {
    acc[g.priority] = (acc[g.priority] || 0) + 1;
    return acc;
  }, {}),
  gaps,
};

fs.writeFileSync(path.join(OUT, "gap-catalog.json"), JSON.stringify(catalog, null, 2));
fs.writeFileSync(
  path.join(OUT, "completion-work-units.json"),
  JSON.stringify(
    {
      schema: "sci-os-v1-completion-work-units/v1",
      label: LABEL,
      at: AT,
      count: units.length,
      byPriority: {
        P0: units.filter((x) => x.priority === "P0").length,
        P1: units.filter((x) => x.priority === "P1").length,
        P2: units.filter((x) => x.priority === "P2").length,
      },
      byWave: {
        W0: units.filter((x) => x.wave === "W0").length,
        W1: units.filter((x) => x.wave === "W1").length,
        W2: units.filter((x) => x.wave === "W2").length,
        W3: units.filter((x) => x.wave === "W3").length,
        W4: units.filter((x) => x.wave === "W4").length,
      },
      byFinishMode: units.reduce((acc, x) => {
        acc[x.finishMode] = (acc[x.finishMode] || 0) + 1;
        return acc;
      }, {}),
      units,
    },
    null,
    2
  )
);

function mdEscape(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function countBy(arr, key) {
  return arr.reduce((acc, x) => {
    const k = x[key] || "?";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

const gapMd = [];
gapMd.push(`# V1 Command Box — Gap Catalog`);
gapMd.push("");
gapMd.push(`**Label:** \`${LABEL}\`  `);
gapMd.push(`**Generated:** ${AT}  `);
gapMd.push(`**Gap atoms:** ${gaps.length}  `);
gapMd.push(`**Work units:** ${units.length} (SPEC → FILE → INTERFACE → IMPLEMENT → WIRE → ERROR → O11Y → TEST → PROOF → GATE)`);
gapMd.push("");
gapMd.push(`> Analysis, not READY. Live OS remains boot \`start-sci-os.cjs\`, Control Plane :3000, Shell \`apps/cockpit-ui\` :4000.`);
gapMd.push("");
gapMd.push(`## How to read an atom`);
gapMd.push("");
gapMd.push(`Each GAP is a live-OS hole or a fork-lock. **Do not mkdir V1 folder names as HTTP apps.**`);
gapMd.push("");
gapMd.push(`| Field | Meaning |`);
gapMd.push(`|-------|---------|`);
gapMd.push(`| Class | ABSENT / PARTIAL_NEAR / UNSPECIFIED / UNWIRED / NAME_ONLY |`);
gapMd.push(`| Finish | lock-existing · do-not-fork · adapter · compose-in-shell · unknown-honest · p2-enterprise |`);
gapMd.push(`| Wave | W0 lock live truth · W1 Shell/UI chrome · W2 engine adapters · W3 composed consoles · W4 P2 enterprise |`);
gapMd.push(`| Layer | Shell / Professional UI / Technical consoles / Engines / tokens / Security / Operations / Platform |`);
gapMd.push("");
gapMd.push(catalog.methodology.honesty);
gapMd.push("");
gapMd.push(`## Counts`);
gapMd.push("");
gapMd.push(`| Class | n |`);
gapMd.push(`|-------|---|`);
for (const [k, v] of Object.entries(catalog.classCounts)) gapMd.push(`| ${k} | ${v} |`);
gapMd.push("");
gapMd.push(`| Wave | GAP n | WU n |`);
gapMd.push(`|------|-------|------|`);
for (const w of ["W0", "W1", "W2", "W3", "W4"]) {
  gapMd.push(`| ${w} | ${catalog.waveCounts[w] || 0} | ${units.filter((x) => x.wave === w).length} |`);
}
gapMd.push("");
gapMd.push(`| Finish mode | n |`);
gapMd.push(`|--------------|---|`);
for (const [k, v] of Object.entries(catalog.finishCounts)) gapMd.push(`| ${k} | ${v} |`);
gapMd.push("");
gapMd.push(`## Catalog by section`);
gapMd.push("");

const bySection = new Map();
for (const g of gaps) {
  const s = g.section || "other";
  if (!bySection.has(s)) bySection.set(s, []);
  bySection.get(s).push(g);
}
const sectionOrder = [
  "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13",
  "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10",
  "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
];
const seen = new Set();
for (const s of [...sectionOrder, ...bySection.keys()]) {
  if (seen.has(s)) continue;
  const list = bySection.get(s);
  if (!list || !list.length) continue;
  seen.add(s);
  const title = SECTION_TITLE[s] || s;
  const part = s.startsWith("1.") ? "1" : s.startsWith("2.") ? "2" : "3";
  gapMd.push(`### ${s} — ${title}`);
  gapMd.push("");
  gapMd.push(`Part ${part}. Atoms: ${list.length}.`);
  gapMd.push("");
  gapMd.push(
    `| ID | Class | Wave | P | Finish | Layer | Missing | Why (user / risk) | Should see | Nearest live |`
  );
  gapMd.push(`|----|-------|------|---|--------|-------|---------|-------------------|------------|--------------|`);
  for (const g of list) {
    gapMd.push(
      `| ${g.id} | ${g.klass} | ${g.wave} | ${g.priority} | ${g.finishMode} | ${mdEscape(g.layer)} | ${mdEscape(g.missing)} | ${mdEscape(g.user + " — " + g.risk)} | ${mdEscape(g.shouldSee)} | ${mdEscape(g.nearest)} |`
    );
  }
  gapMd.push("");
}
fs.writeFileSync(path.join(OUT, "01-GAP-CATALOG.md"), gapMd.join("\n"));

const prioMd = [];
prioMd.push(`# V1 Completion Work Units`);
prioMd.push("");
prioMd.push(`**Count:** ${units.length} = ${gaps.length} GAP × 10 steps (SPEC→GATE).`);
prioMd.push("");
prioMd.push(`W0 locks live boot/Shell/GW1 (do not fork). W1 Shell chrome + tokens. W2 adapters + /v1/obs|/v1/sec. W3 composed consoles with UNKNOWN. W4 enterprise (OIDC/OTLP/durable) — not first-release READY.`);
prioMd.push("");
prioMd.push(`| Wave | Meaning | GAP | WU |`);
prioMd.push(`|------|---------|-----|----|`);
prioMd.push(`| W0 | Lock live truth; refuse second OS | ${catalog.waveCounts.W0 || 0} | ${units.filter((x) => x.wave === "W0").length} |`);
prioMd.push(`| W1 | P0 UI/Shell chrome on cockpit-ui | ${catalog.waveCounts.W1 || 0} | ${units.filter((x) => x.wave === "W1").length} |`);
prioMd.push(`| W2 | P1 engine adapters + obs/sec/jobs APIs; GW1 green | ${catalog.waveCounts.W2 || 0} | ${units.filter((x) => x.wave === "W2").length} |`);
prioMd.push(`| W3 | Technical consoles composed; UNKNOWN-honest | ${catalog.waveCounts.W3 || 0} | ${units.filter((x) => x.wave === "W3").length} |`);
prioMd.push(`| W4 | P2 OIDC / OTLP SDK / durable queue — not ALPHA READY | ${catalog.waveCounts.W4 || 0} | ${units.filter((x) => x.wave === "W4").length} |`);
prioMd.push("");
prioMd.push(`| Priority | WU |`);
prioMd.push(`|----------|----|`);
prioMd.push(`| P0 | ${units.filter((x) => x.priority === "P0").length} |`);
prioMd.push(`| P1 | ${units.filter((x) => x.priority === "P1").length} |`);
prioMd.push(`| P2 | ${units.filter((x) => x.priority === "P2").length} |`);
prioMd.push("");
prioMd.push(`Machine-readable: \`completion-work-units.json\`. Architecture: \`03-COMPLETION-ARCHITECTURE.md\`.`);
prioMd.push("");
fs.writeFileSync(path.join(OUT, "02-WORK-UNITS-INDEX.md"), prioMd.join("\n"));

console.log(
  JSON.stringify(
    {
      ok: true,
      gaps: gaps.length,
      workUnits: units.length,
      classCounts: catalog.classCounts,
      waveCounts: catalog.waveCounts,
      finishCounts: catalog.finishCounts,
      priorityCounts: catalog.priorityCounts,
      out: OUT,
    },
    null,
    2
  )
);
