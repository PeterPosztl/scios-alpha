/**
 * Contract versioning registry — no silent breaking replacement.
 * ALPHA_NON_PRODUCTION
 */

export function buildContractVersionRegistry() {
  return {
    schema: "sci-os-contract-version-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    policy: "Consumers must know which contract version produced data; adapters for breaks",
    contracts: [
      {
        id: "object.schema",
        version: "sci-os-object-registry/v1",
        surface: "packages/product-kernel/src/registries.js",
        protected: true,
      },
      {
        id: "action.schema",
        version: "sci-os-action-execution/v1",
        surface: "packages/product-kernel/src/discipline/action-execution.js",
        protected: true,
      },
      {
        id: "capability.contract",
        version: "docs/enterprise/CAPABILITY_REGISTRY.json#schemaVersion",
        surface: "docs/enterprise/CAPABILITY_REGISTRY.json",
        protected: true,
      },
      {
        id: "workflow.contract",
        version: "sci-os-workflow-registry/v1",
        surface: "packages/product-kernel/src/registries.js",
        protected: true,
      },
      {
        id: "evidence.schema",
        version: "pipeline-contracts + ImmutableLineageStore",
        surface: "packages/data-fabric + packages/vertical-slice",
        protected: true,
      },
      {
        id: "experience.schema",
        version: "sci-os-experience-compile/v1",
        surface: "packages/professional-domain-registry/src/experience-compiler.schema.json",
        protected: true,
      },
      {
        id: "policy.contract",
        version: "embedded-foundation/v1",
        surface: "packages/governance-engine + vertical-slice",
        protected: true,
      },
      {
        id: "prediction.envelope",
        version: "PredictionEnvelopeSchema (data-fabric)",
        surface: "packages/data-fabric/src/pipeline-contracts.ts",
        protected: true,
        changePolicy: "additive Zod preferred",
      },
      {
        id: "risk.envelope",
        version: "RiskDecisionEnvelopeSchema (data-fabric)",
        surface: "packages/data-fabric/src/pipeline-contracts.ts",
        protected: true,
      },
      {
        id: "slo.registry",
        version: "sci-os-slo-registry/v1",
        surface: "packages/product-kernel/src/discipline/slo.js",
        protected: false,
      },
    ],
  };
}
