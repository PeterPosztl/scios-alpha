import type { RepairRecipe, RiskClass } from "../types.js";

export const RECIPE_CATALOG: RepairRecipe[] = [
  {
    recipeId: "recipe.observe_only",
    supportedFailureClasses: ["UNKNOWN_STARTUP_FAILURE"],
    preconditions: ["diagnostics_writable"],
    riskClass: "R0",
    requiredPermissions: [],
    detectionMethod: "observation_bundle",
    repairSteps: ["write_evidence", "no_mutation"],
    expectedChanges: [],
    verification: ["evidence_file_exists"],
    rollback: [],
    attemptLimit: 1,
    timeoutMs: 5000,
    safeModeFallback: true,
    externalEscalationRule: "none",
  },
  {
    recipeId: "recipe.accept_alpha_no_db",
    supportedFailureClasses: ["CONFIG_MISSING"],
    preconditions: ["alpha_mode"],
    riskClass: "R1",
    requiredPermissions: [],
    detectionMethod: "env_DATABASE_URL_absent",
    repairSteps: ["mark_postgresql_optional", "document_degraded"],
    expectedChanges: ["capability_state_PostgreSQL=MISSING_accepted"],
    verification: ["no_secret_invented", "startup_continues"],
    rollback: [],
    attemptLimit: 1,
    timeoutMs: 2000,
    safeModeFallback: true,
    externalEscalationRule: "human_provides_DATABASE_URL",
  },
  {
    recipeId: "recipe.start_control_plane",
    supportedFailureClasses: ["HEALTH_TIMEOUT", "BACKEND_CRASHED"],
    preconditions: ["node_usable", "installer_present"],
    riskClass: "R2",
    requiredPermissions: ["local_process"],
    detectionMethod: "healthz_probe",
    repairSteps: ["invoke_sci_start_or_repair"],
    expectedChanges: ["process_on_5200"],
    verification: ["GET_/healthz_200"],
    rollback: ["pnpm_sci_shutdown"],
    attemptLimit: 2,
    timeoutMs: 120000,
    safeModeFallback: true,
    externalEscalationRule: "if_port_blocked_by_antivirus",
  },
  {
    recipeId: "recipe.start_cockpit",
    supportedFailureClasses: ["DESKTOP_LOAD_FAILED", "HEALTH_TIMEOUT"],
    preconditions: ["control_plane_optional"],
    riskClass: "R2",
    requiredPermissions: ["local_process"],
    detectionMethod: "cockpit_healthz",
    repairSteps: ["invoke_sci_start"],
    expectedChanges: ["process_on_5230"],
    verification: ["GET_cockpit_healthz_200"],
    rollback: ["pnpm_sci_shutdown"],
    attemptLimit: 2,
    timeoutMs: 120000,
    safeModeFallback: true,
    externalEscalationRule: "none",
  },
  {
    recipeId: "recipe.leaf_boot_repair",
    supportedFailureClasses: ["BACKEND_CRASHED", "PACKAGE_BUILD"],
    preconditions: ["pnpm_usable"],
    riskClass: "R2",
    requiredPermissions: ["local_process"],
    detectionMethod: "vertical_slice_smoke",
    repairSteps: ["pnpm_boot_repair"],
    expectedChanges: ["smoke_pass"],
    verification: ["smoke_exit_0"],
    rollback: [],
    attemptLimit: 2,
    timeoutMs: 180000,
    safeModeFallback: true,
    externalEscalationRule: "none",
  },
  {
    recipeId: "recipe.document_missing_electron",
    supportedFailureClasses: ["DESKTOP_LOAD_FAILED"],
    preconditions: ["alpha_mode"],
    riskClass: "R1",
    requiredPermissions: [],
    detectionMethod: "capability_DesktopElectron_MISSING",
    repairSteps: ["record_external_or_absent", "use_browser_cockpit"],
    expectedChanges: ["degraded_profile_accepted"],
    verification: ["cockpit_http_usable"],
    rollback: [],
    attemptLimit: 1,
    timeoutMs: 2000,
    safeModeFallback: true,
    externalEscalationRule: "install_electron_desktop_when_available",
  },
  {
    recipeId: "recipe.document_missing_workers",
    supportedFailureClasses: ["QUEUE_UNAVAILABLE"],
    preconditions: ["alpha_mode"],
    riskClass: "R1",
    requiredPermissions: [],
    detectionMethod: "ABSENT_QUEUE_WORKERS",
    repairSteps: ["mark_workers_absent", "do_not_fake_ready"],
    expectedChanges: ["capability_QueueWorkers=MISSING"],
    verification: ["no_false_worker_ready"],
    rollback: [],
    attemptLimit: 1,
    timeoutMs: 2000,
    safeModeFallback: true,
    externalEscalationRule: "implement_bullmq_workers",
  },
  {
    recipeId: "recipe.r5_destructive_reset",
    supportedFailureClasses: ["DATA_CORRUPTION"],
    preconditions: ["never_auto"],
    riskClass: "R5",
    requiredPermissions: ["admin", "data_owner"],
    detectionMethod: "manual",
    repairSteps: ["PROHIBITED"],
    expectedChanges: [],
    verification: [],
    rollback: [],
    attemptLimit: 0,
    timeoutMs: 0,
    safeModeFallback: false,
    externalEscalationRule: "human_only",
  },
];

export class RepairRecipeRegistry {
  list() {
    return RECIPE_CATALOG;
  }
  get(id: string) {
    return RECIPE_CATALOG.find((r) => r.recipeId === id) ?? null;
  }
}

export class RepairPolicyEngine {
  /** Only R0–R2 auto; R3+ need auth; R5 never */
  allow(risk: RiskClass, opts: { dryRun: boolean; allowR3: boolean }): {
    allowed: boolean;
    reason: string;
  } {
    if (risk === "R5") return { allowed: false, reason: "R5 prohibited autonomous" };
    if (risk === "R4") return { allowed: false, reason: "R4 requires governed approval + backup" };
    if (risk === "R3" && !opts.allowR3)
      return { allowed: false, reason: "R3 requires policy authorization" };
    if (opts.dryRun && (risk === "R2" || risk === "R3"))
      return { allowed: true, reason: "dry-run simulates R2+" };
    return { allowed: true, reason: "within_auto_policy" };
  }
}
