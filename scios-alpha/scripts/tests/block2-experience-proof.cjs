/**
 * BLOCK 2 — Experience Compiler role composition + PDR package API proof.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "cursor-repair");

async function main() {
  const issues = [];
  const { pathToFileURL } = require("node:url");

  const pdrUrl = pathToFileURL(
    path.join(ROOT, "packages/professional-domain-registry/src/index.js")
  ).href;
  const compilerUrl = pathToFileURL(
    path.join(
      ROOT,
      "packages/professional-domain-registry/src/experience-compiler.js"
    )
  ).href;
  const kernelUrl = pathToFileURL(
    path.join(ROOT, "packages/product-kernel/src/index.js")
  ).href;

  const pdr = await import(pdrUrl);
  const { compileExperience } = await import(compilerUrl);
  const { ProductKernel } = await import(kernelUrl);

  const summary = pdr.summary();
  const rolesDev = summary.rolesFullySpecified;
  const rolesSeeded = summary.rolesSeeded;

  // Kernel must load via package API (no packages/.../src json paths)
  const kernel = new ProductKernel(ROOT);
  const rolesKernel = kernel.roles.rolesFullySpecified ?? kernel.roles.archetypes?.length;
  const source = kernel.roles.source;
  if (source !== "@scios/professional-domain-registry") {
    issues.push("KERNEL_NOT_USING_PDR_PACKAGE_API");
  }
  if (rolesKernel !== rolesDev && rolesKernel !== summary.archetypes) {
    // archetypes length is the authority for fully specified
    if ((kernel.roles.archetypes || []).length !== summary.archetypes) {
      issues.push("ROLE_COUNT_MISMATCH_KERNEL_VS_PDR");
    }
  }

  const roles = [
    "arch.market_analyst",
    "arch.fraud_investigator",
    "arch.soc_analyst",
  ];
  const compositions = {};
  for (const roleId of roles) {
    const compiled = compileExperience({
      roleId,
      runtimeMount: true,
      userExperienceLevel: "intermediate",
      permission: {
        actionsAllowed: ["entity:read", "analyze"],
        actionsDenied: ["live_execution"],
        source: "proof",
      },
      riskPolicy: {
        policyId: "proof",
        highRiskActions: ["live_execution"],
        approvalRequired: true,
      },
      availableData: { status: "PARTIAL", bindings: ["vertical-slice.foundation"] },
      sciOsCapabilities: [{ id: "vertical-slice.foundation", proven: true }],
      actor: {
        userId: "proof",
        actorId: `actor:${roleId}`,
        roleId,
        executionMode: "SIMULATION_ONLY",
      },
    });
    compositions[roleId] = {
      profile: compiled.output.workspaceProfileId,
      modules: compiled.output.modules.map((m) => m.id),
      density: compiled.output.density,
      actorRole: compiled.actor?.roleId || compiled.input.roleId,
    };
  }

  const market = compositions["arch.market_analyst"].modules.join(",");
  const fraud = compositions["arch.fraud_investigator"].modules.join(",");
  const soc = compositions["arch.soc_analyst"].modules.join(",");
  if (market === fraud || market === soc || fraud === soc) {
    issues.push("ROLE_COMPOSITIONS_NOT_DISTINCT");
  }
  if (!market.includes("PredictionPanel")) {
    issues.push("MARKET_MISSING_PREDICTION");
  }
  if (!fraud.includes("EvidencePanel")) {
    issues.push("FRAUD_MISSING_EVIDENCE");
  }
  if (!soc.includes("IncidentHeader") && !soc.includes("AlertTimeline")) {
    issues.push("SOC_COMPOSITION_UNEXPECTED");
  }

  // Ghost compiler directory must not contain a second compiler
  const ghostJs = path.join(ROOT, "packages/experience-compiler");
  const ghostFiles = fs.existsSync(ghostJs)
    ? fs.readdirSync(ghostJs).filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
    : [];
  if (ghostFiles.length) issues.push("GHOST_COMPILER_HAS_IMPL");

  // Optional live CP probe
  let live = null;
  try {
    const base = process.env.CONTROL_URL || "http://127.0.0.1:3000";
    const liveComps = {};
    for (const roleId of roles) {
      const res = await fetch(
        `${base}/v1/experience/compile?roleId=${encodeURIComponent(roleId)}`
      );
      if (!res.ok) throw new Error(`compile ${roleId} HTTP ${res.status}`);
      const body = await res.json();
      liveComps[roleId] = (body.output?.modules || []).map((m) => m.id);
      const expected = compositions[roleId].modules;
      const liveMods = liveComps[roleId];
      if (liveMods.join(",") !== expected.join(",")) {
        const requiredByRole = {
          "arch.market_analyst": ["PredictionPanel", "EvidencePanel"],
          "arch.fraud_investigator": ["EvidencePanel"],
          "arch.soc_analyst": ["IncidentHeader", "AlertTimeline"],
        };
        const req = requiredByRole[roleId] || [];
        const missing = req.filter((m) => !liveMods.includes(m));
        if (missing.length) {
          issues.push(`LIVE_MISSING_${roleId}_${missing.join("_")}`);
        } else if (process.env.SCIOS_STRICT_LIVE === "1") {
          issues.push(`LIVE_MISMATCH_${roleId}`);
        }
      }
    }
    live = { ok: true, compositions: liveComps };
  } catch (e) {
    live = { ok: false, error: String(e.message || e), note: "CP not required for offline proof" };
  }

  const proof = {
    schema: "sci-os-block2-experience-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    pdr: summary,
    roleCounts: {
      developmentFullySpecified: rolesDev,
      rolesSeeded,
      kernelArchetypes: (kernel.roles.archetypes || []).length,
      equal:
        rolesDev === (kernel.roles.archetypes || []).length &&
        rolesDev === summary.archetypes,
    },
    compositions,
    compositionsDistinct: market !== fraud && market !== soc && fraud !== soc,
    ghostCompilerDeprecated: ghostFiles.length === 0,
    live,
    issues,
    status: issues.length === 0 ? "PASS" : "FAIL",
  };

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, "proof-block2-experience.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ outPath, status: proof.status, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
