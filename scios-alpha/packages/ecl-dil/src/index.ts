/**
 * @scios/ecl-dil — Enterprise Control Layer + Decision Intelligence Layer.
 * Compose into Control Plane + existing Shell. No second OS / boot / auto-trade.
 * ALPHA_NON_PRODUCTION
 */
export * from "./schemas.js";
export * from "./engines.js";

/**
 * Type-only re-exports for modules whose result types appear in the inferred
 * signatures consumed by apps. Without a nameable path through this entry,
 * consumers hit TS2742 and would have to reach into src/ directly.
 */
export type * from "./professional-compile.js";
export type * from "./workspace-stabilization.js";
export type * from "./explain-visibility.js";
export type * from "./digital-workspace-compute.js";
export type * from "./activation-pass.js";
export type * from "./ecl-ledger-dao.js";
export type * from "./engine-suite.js";
export type * from "./os-blueprint-integration.js";
export type * from "./profession-module-expansion.js";
export { defaultFeedStatus, requestedFeedMode, type DilFeedStatus } from "./feeds.js";
export { SCI_FEED_IDS, buildFeedRegistry, type SciFeedEntry } from "./feed-registry.js";
export { SCI_DEPLOY_IDS, buildDeploymentInventory, type SciDeployEntry } from "./deployment-inventory.js";
export { REALISTIC_SIM_HOOKS, buildRealisticSimulation } from "./realistic-sim.js";
export {
  SCI_ROLE_CATALOG_IDS,
  SCI_SANDBOX_IDS,
  ROLE_PROFESSIONAL_HOOKS,
  buildRoleProfessionalInventory,
} from "./role-professional.js";
export { ProfessionBlueprintSchema, ProfessionHonestySchema, FamilyUxV3Schema, HeroV3Schema, type ProfessionBlueprint, type FamilyUxV3, type HeroV3 } from "./profession-blueprint.js";
export {
  PROFESSION_EXPANSION_HOOKS,
  buildProfessionModuleExpansion,
  applyProfessionModules,
  resolveSeriesAdapter,
  resolveRiskMatrix,
  resolveKgChain,
  resolveAuditChain,
  resolveEdgeDetector,
  resolveDecisionTemplate,
  professionById,
} from "./profession-module-expansion.js";
export {
  OS_BLUEPRINT_HOOKS,
  buildOsBlueprintIntegration,
  applyOsBlueprint,
  osBlueprintById,
  osBlueprintForRole,
  KG_NODE_MAP,
  KG_EDGE_MAP,
} from "./os-blueprint-integration.js";
export { buildProfessionalCompileReport, type ArchetypeCompileResult } from "./professional-compile.js";
export { buildWorkspaceValidationWave, type ValidationCheck } from "./workspace-validation.js";
export {
  buildDeepWorkspaceValidationWave,
  type DeepArchetypeProbe,
} from "./deep-workspace-validation.js";
export {
  buildWorkspaceActivationWave,
  type ActivationCheck,
} from "./workspace-activation.js";
export {
  buildWorkspaceStabilizationWave,
  type StabilizationCheck,
} from "./workspace-stabilization.js";
export {
  buildDigitalActivationWave,
  type DigitalActivationCheck,
} from "./digital-activation.js";
export {
  PRECISION_UPGRADE_HOOKS,
  KG_VISUAL_TOKENS,
  KG_SPINE_LAYERS,
  buildPrecisionUpgradeWave,
  type PrecisionCheck,
} from "./precision-upgrade.js";
export {
  CYBER_BRIDGE_HOOKS,
  CYBER_RESEARCH_CHECKLIST,
  INVESTMENT_BRIDGE_SPEC,
  buildCyberResearchBridgeWave,
  type CyberBridgeCheck,
} from "./cyber-research-bridge.js";
export {
  ACTIVATION_REVIEW_HOOKS,
  NEXT_WAVE_PREP,
  buildActivationReviewWave,
  type ActivationReviewCheck,
} from "./activation-review.js";
export {
  ENTERPRISE_PREP_HOOKS,
  ENTERPRISE_SCENARIOS,
  buildEnterprisePrepWave,
  type EnterprisePrepCheck,
} from "./enterprise-prep.js";
export {
  AUTOMATION_PREP_HOOKS,
  buildAutomationPrepWave,
  type AutomationPrepCheck,
} from "./automation-prep.js";
export {
  VISIBILITY_PREP_HOOKS,
  buildVisibilityPrepWave,
  type VisibilityPrepCheck,
} from "./visibility-prep.js";
export {
  VISIBILITY_ACTIVATION_HOOKS,
  buildVisibilityActivationWave,
  type VisibilityActivationCheck,
} from "./visibility-activation.js";
export {
  VISIBILITY_DEEP_HOOKS,
  buildVisibilityDeepWave,
  type VisibilityDeepCheck,
} from "./visibility-deep.js";
export {
  EXPLAINABILITY_PREP_HOOKS,
  buildExplainabilityPrepWave,
  type ExplainabilityPrepCheck,
} from "./explainability-prep.js";
export {
  EXPLAIN_VISIBILITY_HOOKS,
  buildExplainabilityLayer,
  buildHumanReviewFlow,
  buildCausalPreviewEngine,
  buildWorkspaceExplainPanels,
  buildUnifiedExplainBus,
  flipVisibilityActivationGovernance,
  enableGradualVisibilityMode,
  buildExplainabilityAndVisibilityWave,
} from "./explain-visibility.js";
export {
  DIGITAL_WORKSPACE_COMPUTE_HOOKS,
  activateDigitalKG,
  generateDomainWorkspaces,
  enableCockpitComputeMode,
  createDomainWorkspace,
  buildDigitalAndWorkspaceAndComputeWave,
} from "./digital-workspace-compute.js";
export {
  ACTIVATION_PASS_HOOKS,
  applyExplainabilityLayerSeal,
  applyHumanReviewSeal,
  applyCausalPreviewSeal,
  applyWorkspaceExplainSeal,
  applyWorkspaceExplainPanelsSeal,
  applyUnifiedExplainBusSeal,
  applyVisibilityActivationSeal,
  applyVisibilityActivationGovernanceSeal,
  applyGradualModeSeal,
  applyDigitalKGSeal,
  applyDomainWorkspaceSeal,
  applyDigitalKGPassSeal,
  applyWorkspacePassSeal,
  applyCockpitComputePassSeal,
  activateAllEngines,
  markSystemReady,
  runMasterActivationSuite,
  applyUltimateMasterActivationSuite,
  markExplainVisibilityApplied,
  buildActivationPassWave,
} from "./activation-pass.js";
export {
  AUDIT_LIMIT_HOOKS,
  evaluateAuditLimit,
  parseAuditLimitInput,
  type AuditLimitAction,
  type AuditLimitInput,
  type AuditLimitStatus,
  type AuditLimitVerdict,
} from "./engine-audit.js";
export {
  ENGINE_SUITE_HOOKS,
  createEngineSuite,
  evaluateLimitV1,
  evaluatePredictionV1,
  evaluateRiskV1,
  evaluateKgV1,
  evaluateLineageV1,
  evaluateEvidenceV1,
  evaluateDecisionV1,
  evaluateExecutionSimV1,
  evaluateCockpitComputeV1,
} from "./engine-suite.js";
export {
  BUILD_SUITE_V2_HOOKS,
  createBuildSuiteV2,
  type LedgerKind,
  type LedgerEntry,
  type KgNodeV2,
  type KgEdgeV2,
  type BuildSuiteV2,
} from "./engine-suite-v2.js";
export {
  createEclLedgerDao,
  createMemoryEclSqlClient,
  tryCreatePostgresClientFromEnv,
  ECL_LEDGER_SQL,
  type EclLedgerDao,
  type EclLedgerRow,
} from "./ecl-ledger-dao.js";
export { CLIENT_SUITE_HOOKS, buildClientSuiteInventory } from "./client-suite.js";
export { DURABLE_ADAPTER_HOOKS, buildDurableInfra, readDaemonHeartbeat, daemonHeartbeatPath } from "./durable-adapter.js";
export {
  PHASE_CORE_HOOKS,
  inspectPhase1AuditLimit,
  inspectPhase1ScenarioCausalKg,
  inspectPhase1PredictionRisk,
  inspectPhase2StateTracking,
  inspectPhase3CockpitCompute,
  inspectPhase4Persistence,
  inspectPhase5Daemon,
  inspectPhase6Clients,
  inspectPhase7Domains,
  inspectPhase8Governance,
  inspectCopilotBlueprintBoxes,
  inspectBuildoutConstraints,
  buildPhaseCoreWave,
  type PhaseCoreCheck,
  type PhaseCoreResult,
} from "./phase-core.js";
export {
  buildoutContracts,
  buildCopilotBlueprintWave,
  copilotResidualPlans,
  COPILOT_BOXES,
  type BuildoutContract,
} from "./phase-core-contracts.js";
export {
  AUDIT_ENGINE_CORE_HOOKS,
  inspectAuditEngineCoreLoop,
  inspectAuditEngineListeners,
  inspectAuditEngineEnforcement,
  inspectAuditEngineWriters,
  buildAuditEngineCoreWave,
  type AuditEngineCoreCheck,
  type AuditEngineCoreResult,
} from "./audit-engine-core.js";
export {
  LIMIT_ENGINE_CORE_HOOKS,
  inspectLimitEngineCoreLoop,
  inspectLimitEngineListeners,
  inspectLimitEngineAdvanced,
  inspectLimitEngineRemainder,
  buildLimitEngineCoreWave,
  type LimitEngineCoreCheck,
  type LimitEngineCoreResult,
} from "./limit-engine-core.js";
export {
  LEDGER_CORE_HOOKS,
  inspectLedgerCoreWriter,
  inspectLedgerCoreAdvanced,
  inspectLedgerArchive,
  inspectLedgerCorePath,
  inspectDurableFabricMegafile,
  buildLedgerCoreWave,
  type LedgerCoreCheck,
  type LedgerCoreResult,
} from "./ledger-core.js";
export {
  DOMAIN_FABRIC_HOOKS,
  inspectDomainFabricPath,
  inspectHospitalityDomain,
  inspectHealthcareDomain,
  inspectCyberInvestmentDomains,
  inspectMacroSectorNews,
  inspectDomainFabricBoot,
  buildDomainFabricWave,
  type DomainFabricCheck,
  type DomainFabricResult,
} from "./domain-fabric.js";
export {
  KG_FABRIC_HOOKS,
  inspectKgFabricPath,
  inspectKgNodes,
  inspectKgEdges,
  inspectKgIngestion,
  inspectKgCausal,
  inspectKgScenario,
  inspectKgFabricBoot,
  buildKgFabricWave,
  type KgFabricCheck,
  type KgFabricResult,
} from "./kg-fabric.js";
export {
  SCENARIO_FABRIC_HOOKS,
  inspectScenarioFabricPath,
  inspectScenarioRegistry,
  inspectScenarioLoader,
  inspectScenarioRunner,
  inspectScenarioDomainCausal,
  buildScenarioFabricWave,
  type ScenarioFabricCheck,
  type ScenarioFabricResult,
} from "./scenario-fabric.js";
export {
  CAUSAL_FABRIC_HOOKS,
  inspectCausalFabricPath,
  inspectCausalGraph,
  inspectCausalQuery,
  inspectCausalLineage,
  inspectCausalScenarioGov,
  inspectCausalFabricBoot,
  buildCausalFabricWave,
  type CausalFabricCheck,
  type CausalFabricResult,
} from "./causal-fabric.js";
export {
  GOVERNANCE_FABRIC_HOOKS,
  inspectGovernanceFabricPath,
  inspectGovernanceRules,
  inspectGovernanceHitl,
  inspectGovernanceAuditOverride,
  inspectGovernanceDomain,
  inspectGovernanceFabricBoot,
  buildGovernanceFabricWave,
  type GovernanceFabricCheck,
  type GovernanceFabricResult,
} from "./governance-fabric.js";
export {
  INFRA_FABRIC_HOOKS,
  inspectInfraFabricPath,
  inspectInfraEngine,
  inspectInfraMetrics,
  inspectInfraReadiness,
  inspectInfraDepRecovery,
  inspectInfraFabricBoot,
  buildInfraFabricWave,
  type InfraFabricCheck,
  type InfraFabricResult,
} from "./infra-fabric.js";
export {
  SECURITY_FABRIC_HOOKS,
  inspectSecurityFabricPath,
  inspectSecuritySandbox,
  inspectSecurityPolicy,
  inspectSecurityAudit,
  inspectSecurityDomainGov,
  inspectSecurityFabricBoot,
  buildSecurityFabricWave,
  type SecurityFabricCheck,
  type SecurityFabricResult,
} from "./security-fabric.js";
export {
  OS_FABRIC_HOOKS,
  inspectOsFabricPath,
  inspectOsDaemon,
  inspectOsDesktop,
  inspectOsMobile,
  inspectOsIntegration,
  inspectOsFabricBoot,
  buildOsFabricWave,
  type OsFabricCheck,
  type OsFabricResult,
} from "./os-fabric.js";
export {
  CURSOR_RUNBOOK_HOOKS,
  inspectCursorRunbookSteps,
  inspectCursorRunbookFlags,
  inspectCursorBuildoutFiles,
  inspectRealisticRunbook,
  buildCursorRunbookWave,
  type CursorRunbookCheck,
  type CursorRunbookResult,
} from "./cursor-runbook.js";
export { createEclDilRuntime, type EclDilRuntime } from "./runtime.js";

export const DIL_NON_PRODUCTION_MODELS = [
  {
    modelId: "dil-probability-alpha",
    version: "0.1.0",
    type: "ml" as const,
    inputFeatures: ["implied_price", "volume", "liquidity", "whale_prints"],
    outputType: "distribution" as const,
  },
  {
    modelId: "dil-edge-alpha",
    version: "0.1.0",
    type: "ml" as const,
    inputFeatures: ["model_probability", "implied_probability"],
    outputType: "point" as const,
  },
  {
    modelId: "dil-risk-kelly-alpha",
    version: "0.1.0",
    type: "ml" as const,
    inputFeatures: ["edge", "bankroll", "drawdown", "horizon"],
    outputType: "point" as const,
  },
];

/** Architectural identity — not a production GO. SCI is not a vendor clone. */
export const SCI_SYSTEM_IDENTITY = {
  product: "SCI OS ×10",
  identity: "ENTERPRISE_GRADE_ALPHA" as const,
  identityMeaning:
    "Professional OS identity and unified compose — not READY, not holeless, not enterprise GO",
  coherence: "REQUIRED" as const,
  unifiedArchitecture: true as const,
  humanUsableAlpha: true as const,
  ready: false as const,
  holeless: false as const,
  autoTrade: false as const,
  parallelOS: false as const,
  secondShell: false as const,
  boot: "start-sci-os.cjs",
  controlPlane: ":3000",
  shell: "apps/cockpit-ui :4000",
  composeMap: {
    "sap.erp_core": "ecl.finance + ecl.risk + ecl.reporting",
    "palantir.cockpit": "cockpit.professional + cockpit.technical",
    "citadel.quant_core": "dil.probability + dil.edge + dil.risk + dil.scenario",
    "google.platform": "unified navigation + command palette",
    "apple.design": "packages/design-system SCI tokens",
    "bloomberg.data_ui": "Intelligence + Reporting + Evidence operational panels",
  },
  note: "Inspiration maps onto SCI modules. One product, one boot, one Shell.",
};

/** P2 enterprise surfaces: slots exist, remain disabled. Not ALPHA GO. */
export const ENTERPRISE_HOOKS = {
  schema: "sci-os-enterprise-hooks/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  hooks: {
    oidc: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      note: "AUTH_MODE=local-development. OIDC is P2 — placeholder only.",
    },
    otlp: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      note: "No OTLP SDK export. Local logs/metrics only.",
    },
    durableLedger: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      actual: "in-memory" as const,
      adapter: "sci_ecl DAO + optional Postgres" as const,
      note: "ECL session ledger is in-memory. Optional sci_ecl Postgres DAO exists; durable=true only after INSERT. pg driver not bundled. Enterprise fabric remains P2.",
    },
    liveFeeds: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      note: "Default simulated_alpha. SCI_DIL_FEED=live_unverified is UNVERIFIED, not venue-certified.",
    },
    liveCalibrationEngine: {
      status: "UNKNOWN" as const,
      prepared: true as const,
      enabled: false as const,
      simulated: "ADEQUATE_ALPHA" as const,
      note: "Simulated ADEQUATE_ALPHA is not live calibration. Live remains UNKNOWN.",
    },
    executionEngine: {
      status: "SIMULATION_ONLY" as const,
      prepared: true as const,
      enabled: false as const,
      live: false as const,
      autoTrade: false as const,
      note: "GW1 execution is SIMULATION_ONLY. Live execution engine is P2 — placeholder only.",
    },
  },
};

/**
 * Full-vision blueprints mapped onto existing SCI modules.
 * Prepared inventory — not enabled runtimes. Not a second OS / workflow engine / auto-patcher.
 */
export const BLUEPRINT_HOOKS = {
  schema: "sci-os-blueprint-hooks/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  safeActivation: true as const,
  wiredIntoOs: true as const,
  inspectionUnlocked: true as const,
  secondWorkflowEngine: false as const,
  secondShell: false as const,
  parallelOS: false as const,
  simulationOnly: true as const,
  shellViews: ["agent", "kg", "workflow", "dist"] as const,
  surfaces: {
    lda: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      inProductRuntime: false as const,
      autoPatch: false as const,
      analog: "DIL AI proposals + GOVERNANCE > AGENT; Cursor remains implementer outside the product",
      note: "No LocalDevelopmentAgent patch/AST/LSP runtime in SCI OS. Auto-apply would violate GOVERNANCE > AGENT.",
    },
    knowledgeGraph: {
      status: "PARTIAL" as const,
      prepared: true as const,
      enabled: false as const,
      nationalGraph: false as const,
      causalQueryEngine: "ABSENT" as const,
      analog: "packages/data-fabric ontology + GW1 lineage + professional-domain-registry seeds",
      relationTypes: [
        "PRODUCES",
        "TRAINS",
        "SUPPORTS",
        "REQUIRES",
        "MAY_REQUIRE",
        "CHANGES",
        "EVALUATES",
        "AFFECTS",
        "MODIFIES",
        "VALIDATES",
        "PROVES",
      ],
      nodeKinds: ["entity", "event", "decision", "risk", "evidence", "policy"],
      roleSeedCount: 200,
      note: "Wave-1 in-memory ontology/ledger exists. 200 role seeds are RESEARCH_REQUIRED composition, not a national expert KG.",
    },
    workflowDsl: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      secondEngine: false as const,
      analog: "GW1 VERTICAL_SLICE_STAGES + CF11 job TRANSITION_MATRIX",
      gw1Stages: [
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
      ],
      note: "User-authored workflow DSL is P2 TARGET. A second workflow-engine package/boot is forbidden.",
    },
    distributedOs: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      kafka: "ABSENT" as const,
      redisStreams: "ABSENT" as const,
      multiRegion: false as const,
      analog: "local-foundation single node; optional PG/Redis OPTIONAL_INFRA_DEGRADED; local-durable run index",
      eventStore: "in-memory session + %LOCALAPPDATA% run index",
      note: "Durable event fabric / multi-node is P2. Not ALPHA GO.",
    },
    emotionalEngine: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      versionClaim: "5.x",
      analog: "UX context continuity + professional role presentation — not a stakeholder-emotion simulator",
      note: "EmotionalEngine.5.x is TARGET. No affect model is mounted. UX tokens are not an emotion engine.",
    },
    causalEngine: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      versionClaim: "4.x",
      full: false as const,
      analog: "Ontology AFFECTS/REQUIRES/PROVES + independent_risk_gate on GW1",
      note: "CausalEngine.4.x full is TARGET. Wave-1 relations are typed contracts, not a causal query/do-calculus runtime.",
    },
    sse: {
      status: "PARTIAL" as const,
      prepared: true as const,
      enabled: false as const,
      versionClaim: "3.x",
      full: false as const,
      monteCarlo: false as const,
      analog: "DIL 24h vs stressed scenario + GW1 SIMULATION_ONLY",
      note: "SSE.3.x full Monte Carlo is TARGET. Horizon compare is ALPHA, not a large-scale simulation fabric.",
    },
    osModuleWorkflow: {
      status: "PARTIAL" as const,
      prepared: true as const,
      enabled: false as const,
      analog: "GW1 VERTICAL_SLICE_STAGES — the only live OS workflow",
      note: "OSModule.Workflow maps to GW1. A second OSModule workflow runtime is forbidden.",
    },
    osModuleEventBus: {
      status: "PARTIAL" as const,
      prepared: true as const,
      enabled: false as const,
      analog: "packages/observability InMemoryEventBus (Wave 0 interface)",
      kafka: "ABSENT" as const,
      nats: "ABSENT" as const,
      note: "In-memory bus for tests/logs. Production transport (NATS/Kafka) remains later. Not a cluster fabric.",
    },
    osModuleConsensus: {
      status: "ABSENT" as const,
      prepared: true as const,
      enabled: false as const,
      raft: false as const,
      analog: "independent_risk_gate + governance_decision + 4-role Experience Compiler",
      note: "OSModule.Consensus is decision governance analog, not Raft/Paxos. Multi-node consensus ABSENT.",
    },
  },
  refused: {
    enableLdaAutoPatch: "GOVERNANCE > AGENT",
    secondWorkflowEngine: "PCT-VERTICAL-SLICE-STAGES + GAP-0006",
    kafkaBoot: "oneBoot_oneShell · local-foundation",
    nationalKgAsReady: "no evidence ⇒ UNKNOWN",
    emotionalEngineFull: "no affect model mounted",
    causalEngineFull: "Wave-1 relations ≠ do-calculus",
    sseFull: "horizon compare ≠ Monte Carlo fabric",
    raftConsensus: "governance analog ≠ distributed consensus",
    readyClaim: false,
  },
};

export const ECL_DIL_HONESTY = {
  label: "ALPHA_NON_PRODUCTION" as const,
  autoTrade: false as const,
  winRateClaim: null,
  productionEligible: false,
  holeless: false,
  humanUsableAlpha: true,
  ready: false as const,
  identity: SCI_SYSTEM_IDENTITY.identity,
  unifiedArchitecture: true as const,
  parallelOS: false as const,
  secondShell: false as const,
  liveCalibration: "UNKNOWN" as const,
  simulatedCalibration: "ADEQUATE_ALPHA" as const,
  liveFeeds: "ABSENT" as const,
  oidc: "ABSENT" as const,
  otlp: "ABSENT" as const,
  ledger: "in-memory" as const,
  enterpriseHooks: ENTERPRISE_HOOKS,
  blueprintHooks: BLUEPRINT_HOOKS,
  note: "Edge-seeking decision support. Agent proposes; human decides. Simulated track-record only. Live feeds ABSENT unless SCI_DIL_FEED=live_unverified. OIDC/OTLP/durable ledger/live calibration engine are prepared P2 placeholders (enabled=false), not ALPHA GO. Blueprint inventory is inspectable (inspectionUnlocked=true) and remains enabled=false. Emotional/Causal/SSE full versions and Raft consensus are TARGET. No READY until live proven track-record.",
};
