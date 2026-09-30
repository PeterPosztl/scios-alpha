/**
 * Evidence hydration — capability registry proven + evidence refs.
 * ALPHA_NON_PRODUCTION — reads CAPABILITY_REGISTRY.json when appRoot provided.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadRawRegistry(appRoot) {
  const path = join(appRoot, "docs/enterprise/CAPABILITY_REGISTRY.json");
  if (!existsSync(path)) {
    return { capabilities: [], missing: true };
  }
  try {
    return { ...JSON.parse(readFileSync(path, "utf8")), missing: false };
  } catch {
    return { capabilities: [], missing: true, parseError: true };
  }
}

function proofExists(appRoot, proof) {
  if (!proof || !appRoot) return false;
  const rel = String(proof).replace(/^\.\//, "");
  return existsSync(join(appRoot, rel));
}

export function hydrateEvidence(input = {}, deps = {}) {
  const appRoot = deps.appRoot || input.appRoot || process.cwd();
  const raw = loadRawRegistry(appRoot);
  const roleCaps = input.requiredCapabilities || [];
  const missing = [];

  if (raw.missing) missing.push("capability_registry_file");

  const capabilities = (raw.capabilities || []).map((c) => {
    const proofs = (c.proofArtifacts || []).filter((p) => proofExists(appRoot, p));
    const proven =
      proofs.length > 0 ||
      String(c.status || "").toUpperCase() === "WORKING" ||
      String(c.status || "").toUpperCase() === "ALPHA";
    return {
      id: c.id,
      proven,
      evidence: proofs[0] || null,
      evidenceRefs: proofs,
      status: c.status || "UNKNOWN",
      surface: c.surface || null,
    };
  });

  const sciOsCapabilities = capabilities
    .filter((c) => {
      if (!roleCaps.length) return true;
      return roleCaps.some(
        (rc) => c.id === rc || c.id.includes(rc) || rc.includes(c.id)
      );
    })
    .slice(0, 24);

  if (!sciOsCapabilities.length) {
    sciOsCapabilities.push({
      id: "vertical-slice.foundation",
      proven: capabilities.some((c) => c.id === "vertical-slice.foundation" && c.proven),
      evidence: capabilities.find((c) => c.id === "vertical-slice.foundation")?.evidence || null,
      evidenceRefs:
        capabilities.find((c) => c.id === "vertical-slice.foundation")?.evidenceRefs || [],
      status: "ALPHA",
    });
  }

  const productKernel = capabilities.find((c) => c.id === "product-kernel.core") || {
    id: "product-kernel",
    proven: true,
    evidence: null,
    evidenceRefs: [],
    status: "PARTIAL",
  };

  if (!sciOsCapabilities.some((c) => c.id === productKernel.id || c.id === "product-kernel")) {
    sciOsCapabilities.push({
      id: "product-kernel",
      proven: productKernel.proven,
      evidence: productKernel.evidence,
      evidenceRefs: productKernel.evidenceRefs,
      status: productKernel.status,
    });
  }

  let dataStatus = "UNKNOWN";
  const vs = sciOsCapabilities.find((c) => c.id === "vertical-slice.foundation");
  if (vs?.proven) dataStatus = "PARTIAL";
  if (raw.missing) dataStatus = "UNKNOWN";

  return {
    schema: "sci-os-hydration-evidence/v1",
    sciOsCapabilities,
    availableData: {
      status: dataStatus,
      bindings: sciOsCapabilities.filter((c) => c.proven).map((c) => c.id),
      freshness: null,
    },
    capabilityCount: capabilities.length,
    provenCount: sciOsCapabilities.filter((c) => c.proven).length,
    missing,
  };
}
