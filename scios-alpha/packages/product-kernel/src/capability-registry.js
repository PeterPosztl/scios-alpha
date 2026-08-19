import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Capability maturity states (BLOCK 2) — never PROFILE_DISABLED == ABSENT
 */
export const CAPABILITY_STATES = [
  "SOURCE_EXISTS",
  "REGISTERED",
  "RUNTIME_CONNECTED",
  "UX_CONNECTED",
  "PROFILE_DISABLED",
  "OPTIONAL_PROVIDER_UNAVAILABLE",
  "DISCONNECTED",
  "ABSENT",
  "UNKNOWN",
  "PARTIAL",
  "STUB",
  "UNPROVEN",
];

const STATUS_MAP = {
  ALPHA: "PARTIAL",
  STUB: "STUB",
  WORKING: "RUNTIME_CONNECTED",
  PARTIAL: "PARTIAL",
  DISCONNECTED: "DISCONNECTED",
  MISSING: "ABSENT",
  DEPRECATED: "ABSENT",
  UNPROVEN: "UNPROVEN",
  READY: "UNPROVEN",
  PROFILE_DISABLED: "PROFILE_DISABLED",
};

function isPackaged() {
  return (
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED"
  );
}

function mapStatus(raw, evidenceExists, surfaceExists) {
  const upper = String(raw || "UNPROVEN").toUpperCase();
  if (upper === "PROFILE_DISABLED") return "PROFILE_DISABLED";
  let s = STATUS_MAP[upper] || "UNPROVEN";
  // Packaged: missing source surface ≠ ABSENT capability — may be REGISTERED without staged source
  if (isPackaged() && !surfaceExists && upper !== "MISSING") {
    if (evidenceExists) return "RUNTIME_CONNECTED";
    if (upper === "ALPHA" || upper === "PARTIAL") return "REGISTERED";
    if (s === "ABSENT") return "UNKNOWN";
  }
  if (s === "RUNTIME_CONNECTED" && !evidenceExists) return "UNPROVEN";
  if (s === "PARTIAL" && !evidenceExists && !isPackaged()) return "UNPROVEN";
  return s;
}

function maturityFromStatus(status) {
  switch (status) {
    case "RUNTIME_CONNECTED":
    case "UX_CONNECTED":
      return "L5";
    case "PARTIAL":
    case "REGISTERED":
      return "L3";
    case "STUB":
    case "SOURCE_EXISTS":
      return "L2";
    case "DISCONNECTED":
    case "OPTIONAL_PROVIDER_UNAVAILABLE":
    case "PROFILE_DISABLED":
      return "L1";
    case "ABSENT":
      return "L0";
    default:
      return "L1";
  }
}

/**
 * Build product-kernel capability records from enterprise CAPABILITY_REGISTRY.json
 */
export function loadCapabilityRegistry(appRoot) {
  const path = join(appRoot, "docs/enterprise/CAPABILITY_REGISTRY.json");
  if (!existsSync(path)) {
    // Packaged installs may omit docs — do not invent ABSENT for all capabilities
    if (isPackaged()) {
      return {
        schema: "sci-os-product-capability-registry/v1",
        label: "ALPHA_NON_PRODUCTION",
        source: "PACKAGED_SOURCE_NOT_STAGED",
        capabilities: [],
        note: "Capability metadata docs not staged — states remain UNKNOWN/REGISTERED via runtime probes",
      };
    }
    return { capabilities: [], error: "CAPABILITY_REGISTRY_MISSING" };
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const capabilities = (raw.capabilities || []).map((c) => {
    const proofs = c.proofArtifacts || [];
    const evidenceExists = proofs.some((p) =>
      existsSync(join(appRoot, String(p).replace(/^\.\//, "")))
    );
    const surfaceExists = c.surface
      ? existsSync(join(appRoot, c.surface))
      : false;
    let implementationStatus = mapStatus(
      c.status,
      evidenceExists || surfaceExists,
      surfaceExists
    );
    if (c.status === "STUB") implementationStatus = "STUB";
    if (!surfaceExists && c.surface && !isPackaged()) {
      implementationStatus = "ABSENT";
    } else if (!surfaceExists && c.surface && isPackaged()) {
      implementationStatus =
        implementationStatus === "ABSENT" ? "UNKNOWN" : implementationStatus;
      if (implementationStatus === "UNKNOWN" || implementationStatus === "UNPROVEN") {
        implementationStatus = "REGISTERED";
      }
    }
    if (surfaceExists && implementationStatus === "ABSENT") {
      implementationStatus = "SOURCE_EXISTS";
    }
    if (implementationStatus === "RUNTIME_CONNECTED" && !evidenceExists) {
      implementationStatus = "UNPROVEN";
    }

    return {
      capabilityId: c.id,
      name: c.id,
      domain: c.owner || "platform",
      maturity: maturityFromStatus(implementationStatus),
      implementationStatus,
      implementationProvider: c.surface || null,
      inputs: c.inputs || [],
      outputs: c.outputs || [],
      requiredObjects: [],
      actions: [],
      dependencies: c.dependencies || [],
      permissions: [],
      policies: [],
      evidenceRequirements: proofs,
      healthProbe: c.healthEndpoint || null,
      userFacingViews: [],
      supportedRoles: [],
      simulationSupport:
        String(c.id).includes("execution") ||
        String(c.notes || "").includes("SIMULATION"),
      recoverySupport:
        String(c.id).includes("recovery") || String(c.id).includes("meta"),
      riskTier: c.riskTier || null,
      tests: c.tests || [],
      label: "ALPHA_NON_PRODUCTION",
    };
  });

  const extras = [
    {
      capabilityId: "product-kernel.core",
      name: "Product Kernel",
      domain: "product",
      maturity: "L2",
      implementationStatus: "PARTIAL",
      implementationProvider: "@scios/product-kernel",
      inputs: ["role", "object", "workflow"],
      outputs: ["workspace", "navigation", "actions"],
      evidenceRequirements: ["diagnostics-export/product-kernel/"],
      simulationSupport: false,
      recoverySupport: false,
    },
    {
      capabilityId: "cockpit.professional-view",
      name: "Cockpit Professional View",
      domain: "ux",
      maturity: "L2",
      implementationStatus: "PARTIAL",
      implementationProvider: "apps/cockpit-ui",
      inputs: ["VerticalSliceResponse"],
      outputs: ["professionalAnalysis"],
      evidenceRequirements: [],
      simulationSupport: true,
      recoverySupport: false,
    },
  ];

  return {
    schema: "sci-os-product-capability-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    source: "docs/enterprise/CAPABILITY_REGISTRY.json",
    packaged: isPackaged(),
    capabilities: [...capabilities, ...extras],
  };
}

export function summarizeCapabilities(reg) {
  const counts = {};
  for (const c of reg.capabilities || []) {
    const k = c.implementationStatus || "UNKNOWN";
    counts[k] = (counts[k] || 0) + 1;
  }
  return { total: (reg.capabilities || []).length, counts };
}
