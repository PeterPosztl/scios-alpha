/**
 * Domain control families — expands Closure Engine against product domains.
 * Pattern: domain × control facets. Status from evidence, not vendor clone.
 * ALPHA_NON_PRODUCTION
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "closure");

/**
 * Each domain lists facet controls with evidence-backed status.
 * firstReleaseRequired = must not silently break GW1/local-foundation.
 */
const DOMAINS = [
  {
    id: "DOM.security",
    title: "Security",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: [
      "AUTH_MODE=local-development",
      "SCIOS_BIND default 127.0.0.1",
      "diagnostics-export/final-release/37-security-residual-risk.json",
    ],
    facets: [
      "authn",
      "authz",
      "secrets",
      "input_validation",
      "secure_defaults",
      "rate_limit",
      "threat_model",
    ],
    facetStatus: {
      authn: "PARTIAL",
      authz: "PARTIAL",
      secrets: "PARTIAL",
      input_validation: "PARTIAL",
      secure_defaults: "PROVEN",
      rate_limit: "ABSENT",
      threat_model: "PARTIAL",
    },
    why: "Localhost + SIMULATION_ONLY defaults proven; OIDC/rate-limit production incomplete.",
    proposal: "Keep secure local defaults; schedule OIDC + rate limits as P2.",
  },
  {
    id: "DOM.data-architecture",
    title: "Data architecture",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["packages/data-fabric", "packages/vertical-slice/src/local-durable.ts"],
    facets: ["contracts", "ontology", "durable_store", "schema_registry", "classification"],
    facetStatus: {
      contracts: "PARTIAL",
      ontology: "PARTIAL",
      durable_store: "PARTIAL",
      schema_registry: "ABSENT",
      classification: "ABSENT",
    },
    why: "Zod fabric + local durable exist; enterprise schema registry absent.",
    proposal: "Extend contracts; do not invent enterprise PG as first-release PASS.",
  },
  {
    id: "DOM.database-correctness",
    title: "Database correctness",
    status: "PROFILE_DISABLED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["OPTIONAL_INFRA_DEGRADED", "migration-gate NOT_APPLICABLE"],
    facets: ["acid", "migrations", "constraints", "indexing", "query_correctness"],
    facetStatus: {
      acid: "PROFILE_DISABLED",
      migrations: "PROFILE_DISABLED",
      constraints: "PROFILE_DISABLED",
      indexing: "PROFILE_DISABLED",
      query_correctness: "PROFILE_DISABLED",
    },
    why: "local-foundation does not require PG; correctness gates N/A until PG profile.",
    proposal: "When PG enabled: migrations + constraint + PIT tests mandatory.",
  },
  {
    id: "DOM.distributed-systems",
    title: "Distributed systems",
    status: "DEFERRED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["CURRENT_SYSTEM_TRUTH Full Product Vision durable fabric"],
    facets: ["consensus", "partition_tolerance", "replication", "service_discovery"],
    facetStatus: {
      consensus: "DEFERRED",
      partition_tolerance: "DEFERRED",
      replication: "DEFERRED",
      service_discovery: "ABSENT",
    },
    why: "Single-node local spine; distributed fabric is full-vision.",
    proposal: "Do not fake multi-node readiness.",
  },
  {
    id: "DOM.eventing",
    title: "Eventing",
    status: "PARTIAL",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["packages/observability/src/event-bus.ts", "correlationId in vertical-slice"],
    facets: ["envelope", "ordering", "delivery", "replay", "dlq"],
    facetStatus: {
      envelope: "PARTIAL",
      ordering: "PARTIAL",
      delivery: "ABSENT",
      replay: "ABSENT",
      dlq: "PARTIAL",
    },
    why: "In-memory bus + lineage ordering; durable delivery deferred.",
    proposal: "Keep in-process semantics honest; durable event log as P2.",
  },
  {
    id: "DOM.queueing",
    title: "Queueing",
    status: "PROFILE_DISABLED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["BullMQ PROFILE_DISABLED", "in-memory osSession jobs"],
    facets: ["queue", "retry", "dlq", "priority", "backpressure"],
    facetStatus: {
      queue: "PROFILE_DISABLED",
      retry: "ABSENT",
      dlq: "ABSENT",
      priority: "PARTIAL",
      backpressure: "ABSENT",
    },
    why: "Redis/BullMQ optional; local jobs in-memory only.",
    proposal: "Enable queue profile only with Redis evidence.",
  },
  {
    id: "DOM.ai-agent-architecture",
    title: "AI/agent architecture",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["cockpit AI context panel", "governance > agent doctrine"],
    facets: ["context", "tools", "planner", "multi_agent", "memory"],
    facetStatus: {
      context: "PARTIAL",
      tools: "ABSENT",
      planner: "ABSENT",
      multi_agent: "ABSENT",
      memory: "ABSENT",
    },
    why: "GW1 AI context + approval path; not multi-agent OS.",
    proposal: "No silent agent execute; tool allowlist before agents.",
  },
  {
    id: "DOM.llm-governance",
    title: "LLM governance",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["governance-engine", "LOCAL REVIEW STATE", "action-gate"],
    facets: [
      "no_bypass_permission",
      "no_bypass_policy",
      "human_approval",
      "prompt_injection",
      "output_validation",
      "citation",
    ],
    facetStatus: {
      no_bypass_permission: "PARTIAL",
      no_bypass_policy: "PARTIAL",
      human_approval: "PARTIAL",
      prompt_injection: "ABSENT",
      output_validation: "ABSENT",
      citation: "PARTIAL",
    },
    why: "UX/governance doctrine present; production LLM defenses absent.",
    proposal: "DecisionAction + prompt/output gates before production LLM.",
  },
  {
    id: "DOM.model-science",
    title: "Model science",
    status: "PARTIAL",
    severity: "P2",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: [
      "FOUNDATION/ALPHA/UNVALIDATED labels",
      "packages/model-registry",
      "NO_PROMOTE_ON_SOURCE_EXISTENCE_ALONE",
    ],
    facets: [
      "registry",
      "calibration",
      "validation",
      "promotion",
      "drift",
      "scientifically_validated",
    ],
    facetStatus: {
      registry: "PARTIAL",
      calibration: "PARTIAL",
      validation: "PARTIAL",
      promotion: "ABSENT",
      drift: "ABSENT",
      scientifically_validated: "ABSENT",
    },
    why: "Honesty labels present; scientific validation not claimed.",
    proposal: "Never mark PRODUCTION_ELIGIBLE without evidence.",
  },
  {
    id: "DOM.causal-reasoning",
    title: "Causal reasoning",
    status: "ABSENT",
    severity: "P3",
    firstReleaseRequired: false,
    productionRequired: false,
    evidence: ["CF30 ABSENT", "no causal package"],
    facets: ["hypothesis", "dag", "intervention", "counterfactual", "identifiability"],
    facetStatus: {
      hypothesis: "ABSENT",
      dag: "ABSENT",
      intervention: "ABSENT",
      counterfactual: "ABSENT",
      identifiability: "ABSENT",
    },
    why: "Out of first-release spine.",
    proposal: "Defer; do not stub as READY.",
  },
  {
    id: "DOM.simulation",
    title: "Simulation",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["EXECUTION_MODE=SIMULATION_ONLY", "seeded RNG", "executionOutcome"],
    facets: ["mode", "seed", "determinism", "scenario", "replay", "comparison"],
    facetStatus: {
      mode: "PROVEN",
      seed: "PARTIAL",
      determinism: "PARTIAL",
      scenario: "PARTIAL",
      replay: "PARTIAL",
      comparison: "ABSENT",
    },
    why: "SIMULATION_ONLY proven; scenario depth partial.",
    proposal: "Keep SIMULATION_ONLY default; deepen scenario compare as P2.",
  },
  {
    id: "DOM.cyber-intelligence",
    title: "Cyber intelligence",
    status: "DEFERRED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["arch.soc_analyst Experience profile", "roles-seed cyber_ops"],
    facets: ["detection", "triage", "threat_intel", "response", "soc_workspace"],
    facetStatus: {
      detection: "ABSENT",
      triage: "ABSENT",
      threat_intel: "ABSENT",
      response: "ABSENT",
      soc_workspace: "PARTIAL",
    },
    why: "SOC experience composition exists; CTI runtime absent.",
    proposal: "Compose SOC panels onto proven primitives; no fake CTI.",
  },
  {
    id: "DOM.research-intelligence",
    title: "Research intelligence",
    status: "ABSENT",
    severity: "P3",
    firstReleaseRequired: false,
    productionRequired: false,
    evidence: ["MASTER_CONTRACT ResearchIntelligenceEngine ABSENT"],
    facets: ["literature", "hypothesis_lab", "experiment_tracker"],
    facetStatus: {
      literature: "ABSENT",
      hypothesis_lab: "ABSENT",
      experiment_tracker: "PARTIAL",
    },
    why: "experiment-tracker package scaffold only.",
    proposal: "P3 research suite — not first release.",
  },
  {
    id: "DOM.legal-compliance",
    title: "Legal/compliance",
    status: "DEFERRED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["roles-seed gov_audit_legal", "governance-engine audit helper"],
    facets: ["audit_trail", "policy_library", "retention_law", "e_discovery"],
    facetStatus: {
      audit_trail: "PARTIAL",
      policy_library: "ABSENT",
      retention_law: "ABSENT",
      e_discovery: "ABSENT",
    },
    why: "Lineage/audit partial; compliance product deferred.",
    proposal: "Strengthen evidence audit before compliance claims.",
  },
  {
    id: "DOM.financial-intelligence",
    title: "Financial intelligence",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["GW1 AAPL vertical-slice", "arch.market_analyst", "fin_intel seeds"],
    facets: ["instrument_analyze", "risk_gate", "portfolio", "market_data", "reporting"],
    facetStatus: {
      instrument_analyze: "PARTIAL",
      risk_gate: "PARTIAL",
      portfolio: "ABSENT",
      market_data: "PARTIAL",
      reporting: "ABSENT",
    },
    why: "GW1 market analyze is the first-release FinIntel slice.",
    proposal: "Prove GW1 depth; portfolio/reporting later.",
  },
  {
    id: "DOM.enterprise-search",
    title: "Enterprise search",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["GET /v1/search", "cockpit globalSearch"],
    facets: ["universal", "full_text", "semantic", "acl_aware", "facets"],
    facetStatus: {
      universal: "PARTIAL",
      full_text: "ABSENT",
      semantic: "ABSENT",
      acl_aware: "ABSENT",
      facets: "ABSENT",
    },
    why: "Catalog/run-derived search; not enterprise index.",
    proposal: "Keep GW1 search working; ACL+index as P2.",
  },
  {
    id: "DOM.knowledge-graph",
    title: "Knowledge graph",
    status: "PARTIAL",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["data-fabric ontology", "full graph engine ABSENT note"],
    facets: ["typed_nodes", "typed_edges", "query", "path", "provenance"],
    facetStatus: {
      typed_nodes: "PARTIAL",
      typed_edges: "PARTIAL",
      query: "ABSENT",
      path: "ABSENT",
      provenance: "ABSENT",
    },
    why: "Ontology stubs; engine absent.",
    proposal: "Do not claim KG product until query+provenance proven.",
  },
  {
    id: "DOM.workflow-bpm",
    title: "Workflow/BPM",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["GW1 workflow", "workflow registry gw2-7 MISSING"],
    facets: ["definition", "state", "sla", "escalation", "versioning"],
    facetStatus: {
      definition: "PARTIAL",
      state: "PARTIAL",
      sla: "ABSENT",
      escalation: "ABSENT",
      versioning: "ABSENT",
    },
    why: "GW1 path only — not enterprise BPM.",
    proposal: "Lock GW1; BPM engine is P2/P3.",
  },
  {
    id: "DOM.collaboration",
    title: "Collaboration",
    status: "ABSENT",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["collaboration-primitives DEFER_P2", "gap-to-zero collaboration ABSENT"],
    facets: ["comments", "mentions", "assignments", "presence", "shared_cases"],
    facetStatus: {
      comments: "DEFERRED",
      mentions: "DEFERRED",
      assignments: "DEFERRED",
      presence: "ABSENT",
      shared_cases: "DEFERRED",
    },
    why: "Explicitly deferred from first release.",
    proposal: "Do not implement as silent first-release scope creep.",
  },
  {
    id: "DOM.observability",
    title: "Observability",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["packages/observability", "diagnostics-export", "healthz"],
    facets: ["logs", "metrics", "traces", "correlation", "diagnostics_export"],
    facetStatus: {
      logs: "PARTIAL",
      metrics: "PARTIAL",
      traces: "DISCONNECTED",
      correlation: "PARTIAL",
      diagnostics_export: "PROVEN",
    },
    why: "Diagnostics/export proven; OTel SaaS disconnected.",
    proposal: "Keep diagnostics mandatory; tracing optional until wired.",
  },
  {
    id: "DOM.sre",
    title: "SRE",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["meta-recovery", "process-supervisor", "discipline/slo.js"],
    facets: ["slo", "error_budget", "incident", "runbooks", "oncall"],
    facetStatus: {
      slo: "PARTIAL",
      error_budget: "PARTIAL",
      incident: "ABSENT",
      runbooks: "PARTIAL",
      oncall: "ABSENT",
    },
    why: "Recovery + SLO defs; measured burn/incident absent.",
    proposal: "Measure SLOs before SRE READY claims.",
  },
  {
    id: "DOM.devsecops",
    title: "DevSecOps",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["integrity:preflight", "foundation gates", "secret scan notes"],
    facets: ["ci_gates", "secret_scan", "sast", "dependency_scan", "policy_as_code"],
    facetStatus: {
      ci_gates: "PARTIAL",
      secret_scan: "PARTIAL",
      sast: "UNKNOWN",
      dependency_scan: "PARTIAL",
      policy_as_code: "PARTIAL",
    },
    why: "Integrity/preflight present; full DevSecOps pipeline incomplete.",
    proposal: "Keep gates honest; no UNKNOWN→PASS.",
  },
  {
    id: "DOM.supply-chain",
    title: "Supply chain",
    status: "DEFERRED",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["SBOM future", "artifact hashes PROVEN", "code signing ABSENT"],
    facets: ["sbom", "signing", "provenance", "lockfile", "reproducible_build"],
    facetStatus: {
      sbom: "ABSENT",
      signing: "ABSENT",
      provenance: "PARTIAL",
      lockfile: "PROVEN",
      reproducible_build: "PARTIAL",
    },
    why: "Hashes/lockfile strong; SBOM/signing not first-release blockers if hashes PASS.",
    proposal: "Add SBOM/signing for production.",
  },
  {
    id: "DOM.windows-desktop-lifecycle",
    title: "Windows desktop lifecycle",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: [
      "reboot-certification FileTimeUtc PASS",
      "batch_001_P0 packaged-gw1-proof PASS",
      "atomic-install + LOCALAPPDATA shortcuts",
      "SCI-OS-X10.cmd bundled Node launcher",
    ],
    facets: [
      "install",
      "upgrade",
      "uninstall",
      "reboot",
      "packaged_gw1",
      "process_tree",
    ],
    facetStatus: {
      install: "PARTIAL",
      upgrade: "PARTIAL",
      uninstall: "UNKNOWN",
      reboot: "PARTIAL",
      packaged_gw1: "PROVEN",
      process_tree: "PARTIAL",
    },
    why: "LOCALAPPDATA packaged Home→GW1→Evidence→shutdown proven for current build; Start Menu points at install root.",
    proposal: "Keep EXE pkg packaging as P1 polish; do not reopen packaged_gw1 without fresh fail evidence.",
  },
  {
    id: "DOM.offline-local-operation",
    title: "Offline/local operation",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["local-foundation", "OPTIONAL_INFRA_DEGRADED", "local-durable"],
    facets: ["no_cloud_required", "local_state", "degraded_infra", "airgap"],
    facetStatus: {
      no_cloud_required: "PROVEN",
      local_state: "PARTIAL",
      degraded_infra: "PROVEN",
      airgap: "PARTIAL",
    },
    why: "Designed for local-first; packaged independence still PARTIAL.",
    proposal: "Prove packaged offline Home→GW1 without repo source.",
  },
  {
    id: "DOM.performance",
    title: "Performance",
    status: "UNKNOWN",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["gap-to-zero/20-performance-ux.json measured:false"],
    facets: ["latency", "throughput", "memory", "startup_time", "ui_fps"],
    facetStatus: {
      latency: "UNKNOWN",
      throughput: "UNKNOWN",
      memory: "UNKNOWN",
      startup_time: "PARTIAL",
      ui_fps: "UNKNOWN",
    },
    why: "No fresh measured SLO evidence — UNKNOWN not PASS.",
    proposal: "Add measured latency/startup artifacts before PERF claims.",
  },
  {
    id: "DOM.cost-control",
    title: "Cost control",
    status: "ABSENT",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: ["CF38 budgets ABSENT", "control-tower cost labels only"],
    facets: ["cpu_budget", "token_budget", "storage_quota", "provider_spend"],
    facetStatus: {
      cpu_budget: "ABSENT",
      token_budget: "ABSENT",
      storage_quota: "PARTIAL",
      provider_spend: "ABSENT",
    },
    why: "No enforced budgets.",
    proposal: "Quotas when multi-user/AI providers enabled.",
  },
  {
    id: "DOM.privacy",
    title: "Privacy",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["localhost bind", "privacy-safe log redaction partial", "no deletion API"],
    facets: ["minimization", "retention", "deletion", "export", "safe_logs"],
    facetStatus: {
      minimization: "DEFERRED",
      retention: "PARTIAL",
      deletion: "ABSENT",
      export: "ABSENT",
      safe_logs: "PARTIAL",
    },
    why: "Local single-user reduces blast radius; lifecycle incomplete.",
    proposal: "Deletion/export before multi-user.",
  },
  {
    id: "DOM.backup-dr",
    title: "Backup/DR",
    status: "PARTIAL",
    severity: "P2",
    firstReleaseRequired: false,
    productionRequired: true,
    evidence: [
      "atomic-install app.backup.last retained",
      "failed-boot cleanup PASS (batch_001_P0)",
      "recovery/server.cjs packaged",
      "multi-region RPO/RTO ABSENT (P2)",
    ],
    facets: ["backup", "restore", "rpo", "rto", "drill", "reinstall"],
    facetStatus: {
      backup: "PARTIAL",
      restore: "PARTIAL",
      rpo: "ABSENT",
      rto: "ABSENT",
      drill: "PARTIAL",
      reinstall: "PARTIAL",
    },
    why: "First-release recovery (failed-boot cleanup + install rollback backup + recovery artifact) proven; enterprise DR remains P2.",
    proposal: "Do not treat geo/RPO/RTO as first-release P0.",
  },
  {
    id: "DOM.accessibility",
    title: "Accessibility",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: ["ARIA in cockpit", "no a11y audit artifact", "empty states PROVEN"],
    facets: ["keyboard", "screen_reader", "contrast", "reduced_motion", "audit_gate"],
    facetStatus: {
      keyboard: "PARTIAL",
      screen_reader: "PARTIAL",
      contrast: "PARTIAL",
      reduced_motion: "PARTIAL",
      audit_gate: "ABSENT",
    },
    why: "Basic ARIA present; no evidence PASS for a11y gate.",
    proposal: "Add a11y audit artifact before claiming WCAG.",
  },
  {
    id: "DOM.professional-ux",
    title: "Professional UX",
    status: "PARTIAL",
    severity: "P1",
    firstReleaseRequired: true,
    productionRequired: true,
    evidence: [
      "Professional default PROVEN",
      "Experience Compiler applyCompiledExperience",
      "UX_2026_PARITY PARTIAL",
    ],
    facets: [
      "professional_default",
      "progressive_disclosure",
      "role_relevance",
      "no_raw_json_primary",
      "no_dead_ends",
    ],
    facetStatus: {
      professional_default: "PROVEN",
      progressive_disclosure: "PARTIAL",
      role_relevance: "PARTIAL",
      no_raw_json_primary: "PROVEN",
      no_dead_ends: "PARTIAL",
    },
    why: "Pro path patterns proven; full 2026 parity incomplete.",
    proposal: "Keep Experience→Renderer path; close dead-ends on primary GW1 only.",
  },
];

function mapStatusToIssue(status) {
  if (status === "PROVEN") return { status: "PASS", type: null };
  if (status === "FAIL") return { status: "FAIL", type: "GAP" };
  if (status === "ABSENT") return { status: "FAIL", type: "GAP" };
  if (status === "PARTIAL") return { status: "PARTIAL", type: "GAP" };
  if (status === "DEFERRED") return { status: "DEFERRED", type: "GAP" };
  if (status === "PROFILE_DISABLED") return { status: "NOT_APPLICABLE", type: "GAP" };
  if (status === "DISCONNECTED") return { status: "FAIL", type: "WIRING" };
  if (status === "UNKNOWN") return { status: "UNKNOWN", type: "UNKNOWN" };
  return { status: "UNKNOWN", type: "UNKNOWN" };
}

function build() {
  const controls = [];
  const gaps = [];
  const byStatus = {};

  for (const d of DOMAINS) {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    const domainControl = {
      controlId: d.id,
      title: d.title,
      familyId: "DOMAIN",
      domainId: d.id,
      status: d.status,
      severity: d.status === "PROVEN" ? null : d.severity,
      firstReleaseRequired: d.firstReleaseRequired,
      productionRequired: d.productionRequired,
      whyItMatters: d.why,
      currentEvidence: d.evidence,
      implementationProposal: d.proposal,
      acceptanceTest: `Prove ${d.id} with fresh diagnostics; no evidence ⇒ UNKNOWN`,
      facets: d.facets,
    };
    controls.push(domainControl);

    for (const facet of d.facets) {
      const fsStatus = d.facetStatus[facet] || "UNKNOWN";
      const mapped = mapStatusToIssue(fsStatus);
      const facetControl = {
        controlId: `${d.id}.${facet}`,
        title: `${d.title} · ${facet}`,
        familyId: "DOMAIN",
        domainId: d.id,
        facet,
        status: fsStatus,
        severity:
          fsStatus === "PROVEN" || fsStatus === "PROFILE_DISABLED"
            ? null
            : fsStatus === "FAIL" || (d.firstReleaseRequired && fsStatus === "ABSENT")
              ? d.severity === "P0" || facet === "packaged_gw1"
                ? "P0"
                : d.firstReleaseRequired
                  ? "P1"
                  : d.severity
              : d.severity,
        firstReleaseRequired: d.firstReleaseRequired,
        productionRequired: d.productionRequired,
        whyItMatters: d.why,
        currentEvidence: d.evidence,
        implementationProposal: d.proposal,
        checkStatus: mapped.status,
        type: mapped.type,
      };
      controls.push(facetControl);
      if (fsStatus !== "PROVEN") gaps.push(facetControl);
    }

    if (d.status !== "PROVEN") {
      gaps.push(domainControl);
    }
  }

  // Root causes: one per domain (dedup facets)
  const rootCauses = DOMAINS.filter((d) => d.status !== "PROVEN").map((d) => ({
    rootCauseId: `DOMAIN.${d.id}`,
    title: d.title,
    severity:
      d.status === "FAIL" ||
      Object.values(d.facetStatus).includes("FAIL")
        ? "P0"
        : d.severity,
    type: d.status === "DEFERRED" || d.status === "PROFILE_DISABLED" ? "GAP" : "GAP",
    status: "OPEN",
    domainStatus: d.status,
    affectedFacets: Object.entries(d.facetStatus)
      .filter(([, s]) => s !== "PROVEN")
      .map(([k, s]) => ({ facet: k, status: s })),
    evidence: d.evidence,
    recommendedFix: d.proposal,
    firstReleaseRequired: d.firstReleaseRequired,
    acceptanceTest: d.id === "DOM.windows-desktop-lifecycle"
      ? "Fresh LOCALAPPDATA packaged reboot → Home → GW1 → Evidence PASS"
      : `Domain ${d.id} facets without FAIL/mandatory UNKNOWN`,
  }));

  const topDomains = rootCauses
    .slice()
    .sort((a, b) => {
      const r = { P0: 0, P1: 1, P2: 2, P3: 3 };
      if (a.firstReleaseRequired !== b.firstReleaseRequired) {
        return a.firstReleaseRequired ? -1 : 1;
      }
      return (r[a.severity] ?? 9) - (r[b.severity] ?? 9);
    });

  const register = {
    schema: "sci-os-domain-gap-register/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    source: "user domain list → evidence classification",
    note: "Domain ≠ vendor feature checklist. PROFILE_DISABLED/DEFERRED are valid.",
    domains: DOMAINS.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      severity: d.severity,
      firstReleaseRequired: d.firstReleaseRequired,
      productionRequired: d.productionRequired,
      facetCount: d.facets.length,
      why: d.why,
    })),
    summary: {
      totalDomains: DOMAINS.length,
      byStatus,
      totalControls: controls.length,
      gapControls: gaps.length,
      rootCauses: rootCauses.length,
      p0Domains: rootCauses.filter((r) => r.severity === "P0").length,
      firstReleaseDomains: DOMAINS.filter((d) => d.firstReleaseRequired).length,
    },
    controls,
    gaps,
    rootCauses: topDomains,
    mapsToEnterpriseFamilies: {
      "DOM.security": ["CF24", "CF01", "CF02"],
      "DOM.data-architecture": ["CF04", "CF05", "CF06"],
      "DOM.database-correctness": ["CF21"],
      "DOM.distributed-systems": ["CF10", "CF19"],
      "DOM.eventing": ["CF10"],
      "DOM.queueing": ["CF11"],
      "DOM.ai-agent-architecture": ["CF26", "CF27"],
      "DOM.llm-governance": ["CF27"],
      "DOM.model-science": ["CF28", "CF29"],
      "DOM.causal-reasoning": ["CF30"],
      "DOM.simulation": ["CF31"],
      "DOM.cyber-intelligence": ["CF37", "CF08"],
      "DOM.research-intelligence": ["CF32", "CF33"],
      "DOM.legal-compliance": ["CF25", "CF14", "CF16"],
      "DOM.financial-intelligence": ["CF15", "CF29", "CF08"],
      "DOM.enterprise-search": ["CF07"],
      "DOM.knowledge-graph": ["CF09"],
      "DOM.workflow-bpm": ["CF13"],
      "DOM.collaboration": ["CF34", "CF35"],
      "DOM.observability": ["CF17"],
      "DOM.sre": ["CF18", "CF19", "CF39"],
      "DOM.devsecops": ["CF23", "CF24"],
      "DOM.supply-chain": ["CF23"],
      "DOM.windows-desktop-lifecycle": ["CF22", "CF23", "CF39"],
      "DOM.offline-local-operation": ["CF19", "CF21"],
      "DOM.performance": ["CF18", "CF38"],
      "DOM.cost-control": ["CF38"],
      "DOM.privacy": ["CF25"],
      "DOM.backup-dr": ["CF21", "CF22"],
      "DOM.accessibility": ["CF36"],
      "DOM.professional-ux": ["CF37"],
    },
    nextRepairImplication:
      "TASK-PKG-003 packaged LOCALAPPDATA GW1 closed in batch_001_P0. Next: P1 polish (EXE pkg) or founder-directed P2 domains — do not open 31 parallel tracks.",
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, "domain-gap-register.json"),
    JSON.stringify(register, null, 2) + "\n"
  );

  const md = `# SCI OS ×10 — Domain Gap Register

**Label:** \`ALPHA_NON_PRODUCTION\`  
**Generated:** ${register.at}  
**Domains:** ${DOMAINS.length}  
**Facet controls:** ${controls.length}

## Method

User-listed product domains classified against **current evidence**, not competitor feature matrices.  
\`PROFILE_DISABLED\` / \`DEFERRED\` are valid for local-foundation.

## Domain table

| Domain | Status | Sev | FR? | Why |
|--------|--------|-----|-----|-----|
${DOMAINS.map(
  (d) =>
    `| ${d.title} | ${d.status} | ${d.severity} | ${d.firstReleaseRequired ? "Y" : "N"} | ${d.why} |`
).join("\n")}

## Status counts (domains)

${Object.entries(byStatus)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

## P0 domain facets

${DOMAINS.flatMap((d) =>
  Object.entries(d.facetStatus)
    .filter(([, s]) => s === "FAIL")
    .map(([f]) => `- **${d.id}.${f}** (${d.title})`)
).join("\n") || "- none besides mapped FAIL facets"}

## First-release domain priorities (not all P2)

1. Windows desktop lifecycle — packaged GW1 (**TASK-PKG-003 CLOSED** in batch_001_P0)
2. Backup/DR first-release recovery — reclassified P2 for enterprise DR; install backup + failed-boot cleanup PASS
3. Security / LLM governance / professional UX — keep honesty, close DecisionAction if required
4. Financial intelligence / enterprise search / simulation — deepen GW1 only
5. Do **not** pull collaboration, causal, research, distributed fabric into first release

## Maps into Closure Engine

Re-run \`pnpm closure:continuous\` after this register; domain controls are also emitted as \`DOM.*\` via \`scripts/enterprise/generate-domain-gap-register.mjs\` for repair queue alignment.

Full JSON: \`diagnostics-export/closure/domain-gap-register.json\`
`;

  fs.writeFileSync(path.join(OUT, "domain-gap-summary.md"), md);
  console.log(
    JSON.stringify(
      {
        domains: DOMAINS.length,
        controls: controls.length,
        byStatus,
        p0Roots: topDomains.filter((r) => r.severity === "P0").map((r) => r.rootCauseId),
        out: OUT,
      },
      null,
      2
    )
  );
  return register;
}

build();
