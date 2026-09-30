/**
 * SCI OS Operating Environment registries — Product Kernel workspaces in one shell.
 * ALPHA_NON_PRODUCTION
 */

export const STATUS = Object.freeze({
  READY: "READY",
  DEGRADED: "DEGRADED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  WAITING: "WAITING",
  STALE: "STALE",
  UNKNOWN: "UNKNOWN",
  SIMULATED: "SIMULATED",
  LIVE: "LIVE",
  REPLAY: "REPLAY",
  UNVERIFIED: "UNVERIFIED",
});

export function buildShellRegistry() {
  return {
    schema: "sci-os-shell-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    shellId: "sci.os.shell",
    responsibilities: [
      "application_frame",
      "navigation",
      "workspace_management",
      "panel_management",
      "global_search",
      "command_palette",
      "notifications",
      "system_status",
      "user_context",
      "role_context",
      "background_jobs",
      "settings",
      "help",
      "recovery_access",
    ],
    hostOs: "windows",
    ownsKernel: false,
    note: "Professional operating environment above host OS — not a kernel",
  };
}

export function buildApplicationRegistry() {
  const apps = [
    {
      appId: "app.home",
      name: "Home",
      icon: "home",
      description: "Attention, recent work, system glance",
      requiredCapabilities: ["control-plane-api"],
      supportedRoles: ["*"],
      routes: ["/"],
      commands: ["go.home"],
      workspaceTemplates: ["ws.home"],
      status: "AVAILABLE",
      maturity: "L7",
    },
    {
      appId: "app.work",
      name: "Work",
      icon: "work",
      description: "Recent analyses and open tasks",
      requiredCapabilities: ["control-plane-api"],
      supportedRoles: ["*"],
      routes: ["/work"],
      commands: ["go.work"],
      workspaceTemplates: ["ws.work"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.entities",
      name: "Entities",
      icon: "entity",
      description: "Entity360 universal object workspace",
      requiredCapabilities: ["control-plane-api"],
      supportedRoles: ["*"],
      routes: ["/entities"],
      commands: ["open.entity", "search"],
      workspaceTemplates: ["ws.entity360"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.analyze",
      name: "Analyze",
      icon: "analyze",
      description: "Market / prediction golden workflow",
      requiredCapabilities: ["vertical-slice.foundation"],
      supportedRoles: ["arch.market_analyst", "*"],
      routes: ["/analyze"],
      commands: ["analyze.entity", "run.scenario"],
      workspaceTemplates: ["ws.market_analysis"],
      status: "AVAILABLE",
      maturity: "L7",
    },
    {
      appId: "app.risk",
      name: "Risk",
      icon: "risk",
      description: "Independent risk decisions",
      requiredCapabilities: ["vertical-slice.foundation"],
      supportedRoles: ["*"],
      routes: ["/risk"],
      commands: ["open.risk"],
      workspaceTemplates: ["ws.risk"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.simulate",
      name: "Simulate",
      icon: "sim",
      description: "Simulation-only execution outcomes",
      requiredCapabilities: ["vertical-slice.foundation"],
      supportedRoles: ["*"],
      routes: ["/simulate"],
      commands: ["run.scenario"],
      workspaceTemplates: ["ws.simulate"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.evidence",
      name: "Evidence",
      icon: "evidence",
      description: "Evidence drawer and lineage",
      requiredCapabilities: ["vertical-slice.foundation"],
      supportedRoles: ["*"],
      routes: ["/evidence"],
      commands: ["open.evidence", "open.lineage"],
      workspaceTemplates: ["ws.evidence"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.reports",
      name: "Reports",
      icon: "report",
      description: "Report center (draft/review)",
      requiredCapabilities: [],
      supportedRoles: ["*"],
      routes: ["/reports"],
      commands: ["create.report"],
      workspaceTemplates: ["ws.reports"],
      status: "DEGRADED",
      maturity: "L3",
      note: "Shell surface present; deep report builder PARTIAL",
    },
    {
      appId: "app.cases",
      name: "Cases",
      icon: "case",
      description: "Case workspaces",
      requiredCapabilities: [],
      supportedRoles: ["*"],
      routes: ["/cases"],
      commands: ["create.case"],
      workspaceTemplates: ["ws.case"],
      status: "DEGRADED",
      maturity: "L2",
      note: "Navigation present; fraud/cyber golden workflows not L7",
    },
    {
      appId: "app.system",
      name: "System",
      icon: "system",
      description: "System status and engineering evidence view",
      requiredCapabilities: ["control-plane-api"],
      supportedRoles: ["*"],
      routes: ["/system"],
      commands: ["check.health", "toggle.technical"],
      workspaceTemplates: ["ws.system"],
      status: "AVAILABLE",
      maturity: "L6",
    },
    {
      appId: "app.recovery",
      name: "Recovery",
      icon: "recovery",
      description: "Recovery center / safe mode entry",
      requiredCapabilities: ["scaffold.workspace"],
      supportedRoles: ["*"],
      routes: ["/recovery"],
      commands: ["open.recovery"],
      workspaceTemplates: ["ws.recovery"],
      status: "AVAILABLE",
      maturity: "L5",
    },
    {
      appId: "app.settings",
      name: "Settings",
      icon: "settings",
      description: "Appearance, workspace, notifications",
      requiredCapabilities: [],
      supportedRoles: ["*"],
      routes: ["/settings"],
      commands: ["open.settings"],
      workspaceTemplates: ["ws.settings"],
      status: "AVAILABLE",
      maturity: "L4",
    },
  ];
  return {
    schema: "sci-os-application-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    apps,
  };
}

export function buildWorkspaceRegistry() {
  return {
    schema: "sci-os-workspace-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    templates: [
      { id: "ws.home", panels: ["Attention", "RecentWork", "SystemGlance"] },
      { id: "ws.entity360", panels: ["Overview", "Predictions", "Risk", "Evidence"] },
      {
        id: "ws.market_analysis",
        panels: [
          "ContextBar",
          "ProfessionalResult",
          "PipelineProgress",
          "EvidenceDrawer",
          "TechnicalView",
        ],
      },
      { id: "ws.system", panels: ["StatusCenter", "Engineering"] },
      { id: "ws.recovery", panels: ["RecoveryActions", "Diagnostics"] },
    ],
    features: {
      tabs: true,
      splitViews: "PARTIAL",
      sessionRestore: true,
      pin: true,
      compare: "PARTIAL",
    },
  };
}

export function buildServiceRegistry() {
  return {
    schema: "sci-os-service-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    services: [
      {
        serviceId: "svc.analysis_engine",
        name: "Analysis Engine",
        process: "control-plane / vertical-slice",
        health: "/healthz",
        readiness: "/readyz",
        userImpact: "Predictions and Analyze unavailable when FAILED",
      },
      {
        serviceId: "svc.workers",
        name: "Workers",
        process: "embedded-foundation-worker",
        health: "/v1/foundation/worker-smoke",
        userImpact: "Background jobs delayed",
      },
      {
        serviceId: "svc.cockpit_shell",
        name: "SCI OS Shell",
        process: "cockpit-ui",
        health: "/healthz:4000",
        userImpact: "Entire UI unavailable",
      },
      {
        serviceId: "svc.data",
        name: "Data Services",
        process: "optional PG/Redis",
        health: "external",
        userImpact: "DEGRADED when absent — core still usable",
      },
      {
        serviceId: "svc.risk",
        name: "Risk",
        process: "independent risk gate in vertical-slice",
        health: "pipeline",
        userImpact: "Execution blocked if risk REJECT",
      },
    ],
  };
}

export function buildCommandRegistry() {
  return {
    schema: "sci-os-command-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    shortcut: "Ctrl+K",
    commands: [
      { id: "go.home", title: "Go Home", appId: "app.home" },
      { id: "go.work", title: "Open Work", appId: "app.work" },
      { id: "search", title: "Search everything", appId: "app.home" },
      { id: "open.entity", title: "Open entity…", appId: "app.entities" },
      { id: "analyze.entity", title: "Analyze entity", appId: "app.analyze" },
      { id: "run.scenario", title: "Run scenario (simulation)", appId: "app.simulate" },
      { id: "open.evidence", title: "Open evidence", appId: "app.evidence" },
      { id: "open.lineage", title: "Open full lineage", appId: "app.evidence" },
      { id: "check.health", title: "Check system health", appId: "app.system" },
      { id: "toggle.technical", title: "Toggle technical view", appId: "app.analyze" },
      { id: "open.recovery", title: "Open recovery", appId: "app.recovery" },
      { id: "open.settings", title: "Open settings", appId: "app.settings" },
      { id: "new.workspace", title: "New workspace tab", appId: "app.home" },
      { id: "create.case", title: "Create case (partial)", appId: "app.cases" },
      { id: "create.report", title: "Create report (partial)", appId: "app.reports" },
    ],
  };
}

export function buildNotificationModel() {
  return {
    schema: "sci-os-notification-model/v1",
    types: [
      "INFORMATION",
      "SUCCESS",
      "WARNING",
      "ACTION_REQUIRED",
      "RISK",
      "SECURITY",
      "SYSTEM",
      "RECOVERY",
    ],
    fields: ["source", "object", "severity", "time", "reason", "action", "evidence"],
  };
}

export function buildJobModel() {
  return {
    schema: "sci-os-job-model/v1",
    states: [
      "QUEUED",
      "STARTING",
      "RUNNING",
      "WAITING",
      "COMPLETE",
      "FAILED",
      "CANCELLED",
    ],
    priorities: { P0: "security/recovery", P1: "interactive", P2: "background", P3: "maintenance" },
  };
}

export function buildEnvironmentObjectModel() {
  return {
    schema: "sci-os-environment-objects/v1",
    types: [
      "Application",
      "Workspace",
      "Window",
      "Panel",
      "Tab",
      "Document",
      "Job",
      "Notification",
      "Command",
      "SearchResult",
      "UserSession",
      "ProfessionalSession",
      "SystemService",
      "Capability",
      "Resource",
      "FileArtifact",
      "EvidenceArtifact",
      "Setting",
      "Permission",
    ],
  };
}
