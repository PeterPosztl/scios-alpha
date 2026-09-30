/**
 * System Closure CLI — repository truth + hunters + maturity + signoff.
 * No fake READY. Runtime probes when ports live.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "closure");

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function write(name, obj) {
  ensureOut();
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

function walk(dir, acc = [], depth = 0) {
  if (depth > 12) return acc;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  const skip = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".turbo",
    "sandbox",
    "diagnostics-export",
    ".atom_ai",
    "dev_auto_finish",
    "dev_atom_ai",
  ]);
  for (const e of ents) {
    if (skip.has(e.name) || e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc, depth + 1);
    else if (/\.(js|cjs|mjs|ts|tsx|py|json|md)$/.test(e.name)) acc.push(abs);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function httpGet(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        let body = Buffer.concat(chunks).toString("utf8");
        try {
          body = JSON.parse(body);
        } catch {
          /* text */
        }
        resolve({ status: res.statusCode || 0, body });
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function httpPost(urlPath, data, port = 3000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.write(payload);
    req.end();
  });
}

/** SystemTruthEngine */
async function repositoryTruth() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  );
  const caps = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "docs/enterprise/CAPABILITY_REGISTRY.json"),
      "utf8"
    )
  );
  const atomAiExists = fs.existsSync(path.join(ROOT, "atom_ai"));
  const files = walk(ROOT);
  return {
    at: new Date().toISOString(),
    schema: "sci-os-repository-truth/v1",
    label: "ALPHA_NON_PRODUCTION",
    root: ROOT.replace(/\\/g, "/"),
    packageName: pkg.name,
    packageManager: pkg.packageManager || "pnpm",
    scannedFiles: files.length,
    capabilityRegistryCount: (caps.capabilities || []).length,
    capabilities: (caps.capabilities || []).map((c) => ({
      id: c.id,
      status: c.status,
      surface: c.surface,
    })),
    atomAiParallelTree: atomAiExists
      ? "PRESENT_REJECTED_AS_PARALLEL"
      : "ABSENT_GOOD",
    canonicalProduct: "SCI OS ×10 (scios-alpha)",
    naming: {
      atomAi: "legacy/parallel scripts rejected — not a second OS",
      sciOs: "canonical",
    },
  };
}

/** Placeholder / false-ready hunters */
function huntPlaceholders(files) {
  const findings = [];
  const patterns = [
    { id: "TODO", re: /\bTODO\b/ },
    { id: "FIXME", re: /\bFIXME\b/ },
    { id: "not_implemented", re: /not implemented|NotImplementedError/i },
    { id: "stub_literal", re: /\bstub\b/i },
    { id: "placeholder", re: /placeholder/i },
    {
      id: "hardcoded_ready_obj",
      re: /["']ready["']\s*:\s*true|return\s*\{\s*["']ready["']\s*:\s*true/,
    },
    {
      id: "fake_guardian",
      re: /["']guardian["']\s*:\s*["']active["']/,
    },
    {
      id: "fake_optimized",
      re: /["']performance["']\s*:\s*["']optimized["']/,
    },
    {
      id: "fake_dashboard_ready",
      re: /["']dashboard["']\s*:\s*["']ready["']/,
    },
  ];
  for (const f of files) {
    if (!/\.(js|cjs|mjs|ts|tsx|py)$/.test(f)) continue;
    let text;
    try {
      text = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    if (text.length > 800000) continue;
    for (const p of patterns) {
      if (p.re.test(text)) {
        findings.push({
          file: rel(f),
          pattern: p.id,
          note: "Review — may be legitimate test/doc",
        });
      }
    }
  }
  return findings;
}

function huntFalseReady(files) {
  const findings = [];
  const re =
    /\b(READY|PASS|HEALTHY|APPROVED|OPTIMIZED|ACTIVE)\b/;
  for (const f of files) {
    if (!/\.(js|cjs|mjs|ts|tsx|py)$/.test(f)) continue;
    let text;
    try {
      text = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    // Focus on return-constant success smells
    if (
      /return\s*\{\s*[^}]*["'](ready|status|guardian|dashboard|performance|api|watchdog)["']\s*:\s*["']?(ready|active|ok|optimized|true)/i.test(
        text
      )
    ) {
      findings.push({
        file: rel(f),
        kind: "constant_success_object",
        severity: "high",
      });
    }
    if (f.includes("atom_ai") || f.includes("dev_atom_ai") || f.includes("dev_auto_finish")) {
      if (re.test(text)) {
        findings.push({
          file: rel(f),
          kind: "parallel_kit_status_language",
          severity: "medium",
        });
      }
    }
  }
  return findings;
}

/** Historical gap claims vs truth */
function classifyStaleGaps(caps, live) {
  const byId = Object.fromEntries(
    (caps.capabilities || []).map((c) => [c.id, c])
  );
  const historical = [
    { claim: "Risk Gate missing", related: ["risk-engine.fastapi", "vertical-slice.foundation"] },
    { claim: "Governance missing", related: ["vertical-slice.foundation", "control-plane-api"] },
    { claim: "Execution missing", related: ["execution-simulator", "vertical-slice.foundation"] },
    { claim: "Lineage missing", related: ["vertical-slice.foundation", "ledger.wave1"] },
    { claim: "API missing", related: ["control-plane-api"] },
    { claim: "Cockpit missing", related: ["vertical-slice.foundation"] },
    { claim: "Startup missing", related: ["scaffold.workspace"] },
    { claim: "Health missing", related: ["control-plane-api"] },
  ];
  return historical.map((h) => {
    const statuses = h.related.map((id) => byId[id]?.status || "UNKNOWN");
    let classification = "UNPROVEN";
    if (statuses.every((s) => s === "ABSENT")) classification = "MISSING";
    else if (statuses.some((s) => s === "STUB")) classification = "STUB";
    else if (statuses.some((s) => s === "ALPHA")) {
      classification = live?.verticalSlice?.hasRisk ? "PARTIAL" : "PARTIAL";
    }
    // Refine with live probes
    if (h.claim.includes("Cockpit") && live?.cockpit?.healthz === 200)
      classification = "WORKING";
    if (h.claim.includes("Health") && live?.api?.healthz === 200)
      classification = "WORKING";
    if (h.claim.includes("Startup") && live?.api?.ready === true)
      classification = "WORKING";
    if (
      h.claim.includes("Risk") &&
      live?.verticalSlice?.hasRisk &&
      live?.verticalSlice?.status === 200
    )
      classification = "PARTIAL";
    if (
      h.claim.includes("Governance") &&
      live?.verticalSlice?.hasGov
    )
      classification = "PARTIAL";
    if (
      h.claim.includes("Execution") &&
      live?.verticalSlice?.hasExec
    )
      classification = "PARTIAL";
    if (
      h.claim.includes("Lineage") &&
      live?.verticalSlice?.hasLineage
    )
      classification = "PARTIAL";
    if (h.claim.includes("API") && live?.api?.healthz === 200)
      classification = "WORKING";

    const stale =
      classification === "WORKING" ||
      classification === "PARTIAL" ||
      classification === "STUB";
    return {
      historicalClaim: h.claim,
      relatedCaps: h.related,
      registryStatuses: statuses,
      classification,
      staleClaim: stale && h.claim.includes("missing"),
      action: stale
        ? "Do NOT re-implement — connect/harden existing"
        : "Investigate true gap",
    };
  });
}

function maturityFromCap(cap, live) {
  const status = cap.status;
  let level = 0;
  let label = "L0_CONCEPT";
  if (status === "ABSENT") return { level: 0, label: "L0_ABSENT" };
  if (status === "STUB") return { level: 2, label: "L2_CODE_EXISTS_STUB" };
  if (status === "ALPHA") {
    level = 3;
    label = "L3_CONNECTED_OR_ALPHA";
  }
  // Promote vertical-slice if live proof
  if (
    cap.id === "vertical-slice.foundation" &&
    live?.verticalSlice?.status === 200 &&
    live.verticalSlice.hasPrediction &&
    live.verticalSlice.hasRisk &&
    live.verticalSlice.hasGov &&
    live.verticalSlice.hasExec &&
    live.verticalSlice.hasLineage
  ) {
    return { level: 6, label: "L6_END_TO_END_RUNTIME_PROVEN" };
  }
  if (cap.id === "control-plane-api" && live?.api?.ready === true) {
    return { level: 5, label: "L5_RUNTIME_PROVEN" };
  }
  return { level, label };
}

async function probeP0() {
  const apiPort = Number(process.env.PORT || 3000);
  const cockpitPort = Number(process.env.SCIOS_COCKPIT_PORT || 4000);
  const [hz, rz, ck, slice] = await Promise.all([
    httpGet(`http://127.0.0.1:${apiPort}/healthz`),
    httpGet(`http://127.0.0.1:${apiPort}/readyz`),
    httpGet(`http://127.0.0.1:${cockpitPort}/healthz`),
    httpPost(
      "/api/vertical-slice/run",
      { instrumentId: "AAPL", horizonSec: 3600, size: 10 },
      apiPort
    ),
  ]);
  const body = slice.body || {};
  return {
    at: new Date().toISOString(),
    apiPort,
    cockpitPort,
    api: {
      healthz: hz.status,
      readyz: rz.status,
      ready: rz.body && rz.body.ready === true,
      body: rz.body || null,
    },
    cockpit: { healthz: ck.status },
    verticalSlice: {
      status: slice.status,
      hasPrediction: !!(body.predictionEnvelope || body.prediction),
      hasRisk: !!(body.riskDecision || body.risk),
      hasGov: !!(body.governanceDecision || body.governance),
      hasExec: !!(body.executionOutcome || body.execution),
      hasLineage: !!body.lineage,
      runId: body.runId || null,
    },
    p0Pass:
      hz.status === 200 &&
      rz.status === 200 &&
      rz.body?.ready === true &&
      ck.status === 200 &&
      slice.status === 200,
  };
}

function buildCompletionGraph(caps, maturity) {
  return {
    schema: "sci-os-completion-graph/v1",
    nodes: (caps.capabilities || []).map((c) => ({
      id: c.id,
      kind: "capability",
      status: c.status,
      maturity: maturity[c.id] || null,
      surface: c.surface,
      dependencies: c.dependencies || [],
    })),
    edges: (caps.capabilities || []).flatMap((c) =>
      (c.dependencies || []).map((d) => ({ from: d, to: c.id }))
    ),
    chain: [
      "ArchitectureRequirement",
      "Capability",
      "Implementation",
      "Dependencies",
      "Data",
      "Contract",
      "API_Event",
      "Workflow",
      "Risk_Governance",
      "UX",
      "Test",
      "RuntimeEvidence",
      "ProfessionalUse",
    ],
  };
}

function dodCompiler() {
  return {
    schema: "sci-os-definition-of-done/v1",
    note: "File existence ≠ done. Each checkbox needs evidence.",
    capabilities: [
      {
        id: "Independent Risk Gate",
        criteria: [
          "INPUT_CONTRACT",
          "REAL_IMPLEMENTATION",
          "INDEPENDENT_FROM_PREDICTION",
          "LIMITS_ENFORCED",
          "KILL_BLOCK_PATH_TESTED",
          "LINEAGE",
          "GOVERNANCE_RECEIVES",
          "UX_REAL_RESULT",
          "UNIT",
          "INTEGRATION",
          "NEGATIVE",
          "RUNTIME_PROOF",
        ],
      },
      {
        id: "vertical-slice.foundation",
        criteria: [
          "PIT_FEATURES",
          "PREDICTION_ENVELOPE",
          "RISK_DECISION",
          "GOVERNANCE_DECISION",
          "SIM_EXECUTION",
          "LINEAGE_LINKS",
          "RUNTIME_PROOF",
          "COCKPIT_DISPLAY",
        ],
      },
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  ensureOut();
  const files = walk(ROOT);
  const truth = await repositoryTruth();
  write("repository-truth.json", truth);

  const live = await probeP0();
  const p0Name = args.includes("--after") ? "p0-after.json" : "p0-before.json";
  write(p0Name, live);
  write("p0-live-probe.json", live);

  const caps = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "docs/enterprise/CAPABILITY_REGISTRY.json"),
      "utf8"
    )
  );

  const stale = classifyStaleGaps(caps, live);
  write("stale-gap-claims.json", {
    at: new Date().toISOString(),
    claims: stale,
  });

  const placeholders = huntPlaceholders(files);
  write("placeholder-report.json", {
    at: new Date().toISOString(),
    count: placeholders.length,
    findings: placeholders.slice(0, 500),
    note: "Review required — tests/docs may legitimately contain stubs",
  });

  const falseReady = huntFalseReady(files);
  write("false-ready-report.json", {
    at: new Date().toISOString(),
    count: falseReady.length,
    findings: falseReady.slice(0, 200),
  });

  // Duplicates / disconnected — heuristic
  const duplicates = [
    {
      concern: "startup",
      candidates: [
        "installer/scripts/start-sci-os.cjs",
        "installer/scripts/bootstrap-capsule.cjs",
        "bootstrap/bootstrap-capsule.js",
        "scripts/boot/index.mjs",
      ],
      canonical: "pnpm sci:start → bootstrap-capsule.cjs → start-sci-os.cjs",
      status: "CANONICAL_CHOSEN",
    },
    {
      concern: "parallel_atom_ai",
      candidates: ["atom_ai/", "dev_atom_ai/", "historical assembler scripts"],
      canonical: "SCI OS ×10 only — reject parallel OS trees",
      status: "DEPRECATE_PARALLEL",
    },
  ];
  write("duplicate-implementations.json", { at: new Date().toISOString(), duplicates });

  write("disconnected-modules.json", {
    at: new Date().toISOString(),
    findings: [
      {
        id: "enterprise.modules.sections-49-83",
        classification: "ABSENT",
        note: "Registry marks ABSENT — not disconnected code",
      },
      {
        id: "professional_ux_shell",
        classification: "DISCONNECTED_CONTRACT",
        note: "UX Core/compiler contracts exist; adaptive /app host ABSENT",
      },
      {
        id: "experience_compiler",
        classification: "PARTIAL",
        note: "Dry-run compiler PRESENT; not mounted in cockpit",
      },
    ],
  });

  write("dead-features.json", {
    at: new Date().toISOString(),
    findings: [
      {
        id: "canonical_forensic_nav",
        classification: "KEEP_FOR_FUTURE",
        note: "Graph→Executive nav documented; not in ALPHA cockpit",
      },
    ],
  });

  const maturity = {};
  for (const c of caps.capabilities || []) {
    maturity[c.id] = maturityFromCap(c, live);
  }
  write("capability-maturity.json", {
    at: new Date().toISOString(),
    maturity,
    objective: { coreFoundationMin: "L6", goldenWorkflowMin: "L7" },
  });

  write("completion-graph.json", buildCompletionGraph(caps, maturity));
  write("definition-of-done.json", dodCompiler());

  write("dependency-order.json", {
    order: [
      "FOUNDATION",
      "CAPABILITY",
      "WORKFLOW",
      "PROFESSIONAL_UX",
      "ROLE_EXPANSION",
      "MARKETING_COMPLETION",
    ],
    nextBlocker: live.p0Pass
      ? "Professional UX host + Golden Workflow #1 professional view (keep engineering view)"
      : "P0 runtime down — start with pnpm sci:start -- --no-open then re-scan",
  });

  write("contract-gap-report.json", {
    at: new Date().toISOString(),
    note: "Unified config/contract fabric still partial across packages",
    gaps: [
      {
        id: "canonical_config_system",
        status: live.p0Pass ? "PARTIAL" : "UNPROVEN",
      },
      { id: "event_fabric_durable", status: "PARTIAL_LOCAL" },
      { id: "evidence_envelope_universal", status: "PARTIAL" },
    ],
  });

  write("implemented-fixes.json", {
    at: new Date().toISOString(),
    fixes: [
      {
        id: "system_closure_engine_bootstrap",
        description:
          "Added @scios/system-closure scanners + closure artifact pipeline",
        type: "tooling",
      },
    ],
  });

  const gw1 = {
    id: "golden_workflow_1_aapl_analysis",
    status: live.verticalSlice?.status === 200 ? "RUNTIME_PARTIAL" : "BLOCKED_P0_DOWN",
    steps: {
      prediction: live.verticalSlice?.hasPrediction || false,
      risk: live.verticalSlice?.hasRisk || false,
      governance: live.verticalSlice?.hasGov || false,
      execution: live.verticalSlice?.hasExec || false,
      lineage: live.verticalSlice?.hasLineage || false,
      professionalUx: false,
      engineeringUx: true,
    },
    maturityTarget: "L7",
    currentMaturity: live.verticalSlice?.status === 200 ? "L6_ENGINEERING" : "L0",
  };
  write("golden-workflow-proof.json", {
    at: new Date().toISOString(),
    workflows: [gw1],
  });

  const criticalFalseReady = falseReady.filter((f) => f.severity === "high");
  let verdict = "FOUNDATION_DEGRADED";
  if (!live.p0Pass) verdict = "FOUNDATION_DEGRADED";
  if (
    live.p0Pass &&
    gw1.status === "RUNTIME_PARTIAL" &&
    criticalFalseReady.length === 0
  ) {
    verdict = "FOUNDATION_DEGRADED"; // professional UX still missing → not CLOSED
  }
  // NO_GO if we detect bypassable risk/gov with false ready in core path — not claimed here without proof of bypass

  const signoff = {
    at: new Date().toISOString(),
    schema: "sci-os-system-closure-signoff/v1",
    label: "ALPHA_NON_PRODUCTION",
    verdict,
    p0Pass: !!live.p0Pass,
    goldenWorkflow1: gw1,
    staleClaimsReviewed: stale.length,
    placeholderFindings: placeholders.length,
    falseReadyHigh: criticalFalseReady.length,
    nextDependencyBlocker: live.p0Pass
      ? "Mount Experience Compiler → Adaptive Workspace host; professional view for Golden Workflow #1"
      : "Restore P0: pnpm sci:start -- --no-open",
    stopConditionFoundationClosed: false,
    note: "FOUNDATION CLOSED requires professional UX on real results + GW1 E2E L7. Do not equate scan tooling with product closure.",
  };
  write("system-closure-signoff.json", signoff);

  console.log(
    JSON.stringify(
      {
        ok: true,
        verdict,
        p0Pass: live.p0Pass,
        outDir: "diagnostics-export/closure",
        next: signoff.nextDependencyBlocker,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
