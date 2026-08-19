/**
 * Enterprise discipline — SLO registry for FIRST RELEASE professional outcomes.
 * Extends Product Kernel; does not create a parallel OS.
 * ALPHA_NON_PRODUCTION
 */

export const MATURITY_STATES = [
  "DRAFT",
  "EXPERIMENTAL",
  "ACTIVE",
  "VALIDATED",
  "PROMOTED",
  "DEPRECATED",
  "RETIRED",
];

export const DISCIPLINE_SCHEMA = "sci-os-enterprise-discipline/v1";

/** First-release professional SLOs — not vanity 100% targets. */
export function buildSloRegistry(opts = {}) {
  const window = opts.measurementWindow || "7d_rolling_or_release_candidate";
  const unknown = "UNKNOWN_UNTIL_MEASURED";
  return {
    schema: "sci-os-slo-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    policy: "Error budget exhaustion blocks unrelated expansion on the dependency path",
    slos: [
      {
        id: "STARTUP_TO_HOME",
        metric: "p95_ms_boot_to_home_http_ok",
        target: "<= 45000",
        measurementWindow: window,
        errorBudget: "10% of starts may miss",
        currentConsumption: unknown,
        releaseImpact: "P0 if budget exhausted during release candidate",
        dependencyPath: ["bootstrap", "start-sci-os", "control-plane", "cockpit"],
      },
      {
        id: "SEARCH_SUCCESS",
        metric: "success_rate_v1_search_for_known_instrument",
        target: ">= 0.99",
        measurementWindow: window,
        errorBudget: "1%",
        currentConsumption: unknown,
        releaseImpact: "P1 — blocks search UX expansion",
        dependencyPath: ["control-plane", "product.search"],
      },
      {
        id: "ENTITY360_OPEN",
        metric: "success_rate_v1_entities_open",
        target: ">= 0.99",
        measurementWindow: window,
        errorBudget: "1%",
        currentConsumption: unknown,
        releaseImpact: "P1",
        dependencyPath: ["control-plane", "product.entity"],
      },
      {
        id: "ANALYSIS_COMPLETION",
        metric: "success_rate_vertical_slice_run_http_2xx",
        target: ">= 0.98",
        measurementWindow: window,
        errorBudget: "2%",
        currentConsumption: unknown,
        releaseImpact: "P0 for GW1 path",
        dependencyPath: ["vertical-slice", "prediction", "risk", "governance"],
      },
      {
        id: "RISK_GOVERNANCE_COMPLETION",
        metric: "rate_risk_and_governance_envelopes_present",
        target: ">= 0.995",
        measurementWindow: window,
        errorBudget: "0.5%",
        currentConsumption: unknown,
        releaseImpact: "P0 — philosophy violation if missing",
        dependencyPath: ["vertical-slice", "governance-engine"],
      },
      {
        id: "EVIDENCE_OPEN",
        metric: "success_rate_lineage_fetch_after_run",
        target: ">= 0.99",
        measurementWindow: window,
        errorBudget: "1%",
        currentConsumption: unknown,
        releaseImpact: "P1",
        dependencyPath: ["vertical-slice.lineage", "cockpit.evidence"],
      },
      {
        id: "GW1_COMPLETION",
        metric: "e2e_home_search_entity_analyze_evidence",
        target: ">= 0.95",
        measurementWindow: window,
        errorBudget: "5%",
        currentConsumption: unknown,
        releaseImpact: "P0 first-release gate",
        dependencyPath: ["shell", "control-plane", "vertical-slice"],
      },
      {
        id: "CLEAN_SHUTDOWN",
        metric: "rate_supervisor_clean_exit",
        target: ">= 0.98",
        measurementWindow: window,
        errorBudget: "2%",
        currentConsumption: unknown,
        releaseImpact: "P1 packaged path",
        dependencyPath: ["process-supervisor", "bootstrap"],
      },
      {
        id: "RECOVERY_SUCCESS",
        metric: "rate_meta_recovery_or_repair_restores_core",
        target: ">= 0.90",
        measurementWindow: window,
        errorBudget: "10%",
        currentConsumption: unknown,
        releaseImpact: "P1",
        dependencyPath: ["meta-recovery", "bundled-node"],
      },
    ],
  };
}

export function assessErrorBudgets(sloRegistry, measured = {}) {
  const statuses = (sloRegistry.slos || []).map((s) => {
    const m = measured[s.id];
    let budgetState = "UNKNOWN";
    let blockExpansion = false;
    if (m && m.consumptionRatio != null) {
      if (m.consumptionRatio >= 1) {
        budgetState = "EXHAUSTED";
        blockExpansion = true;
      } else if (m.consumptionRatio >= 0.8) {
        budgetState = "AT_RISK";
      } else {
        budgetState = "OK";
      }
    }
    return {
      sloId: s.id,
      budgetState,
      blockExpansion,
      currentConsumption: m?.currentConsumption ?? s.currentConsumption,
      dependencyPath: s.dependencyPath,
    };
  });
  return {
    schema: "sci-os-error-budget-status/v1",
    label: "ALPHA_NON_PRODUCTION",
    anyExhausted: statuses.some((s) => s.budgetState === "EXHAUSTED"),
    expansionBlockedPaths: [
      ...new Set(
        statuses.filter((s) => s.blockExpansion).flatMap((s) => s.dependencyPath || [])
      ),
    ],
    statuses,
    note: "No measured production traffic yet — UNKNOWN is honest, not PASS",
  };
}
