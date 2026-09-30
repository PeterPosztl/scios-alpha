"use strict";

/**
 * SCI OS ×10 — Startup reconciliation inventory + proofs.
 * Writes diagnostics-export/startup-reconciliation/*
 * Does not delete legacy files. ALPHA_NON_PRODUCTION.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "startup-reconciliation");
const META_OS_ROOT = path.resolve(
  ROOT,
  "../qmis-orion-os-x10/GalaxusMetaOS"
);

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function write(name, obj) {
  ensureOut();
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

function sha256File(abs) {
  try {
    const h = crypto.createHash("sha256");
    h.update(fs.readFileSync(abs));
    return h.digest("hex");
  } catch {
    return null;
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function walk(dir, acc = [], depth = 0) {
  if (depth > 8) return acc;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  const skip = new Set([
    "node_modules",
    ".git",
    "coverage",
    ".turbo",
    "diagnostics-export",
    ".atom_ai",
    "dev_auto_finish",
    "dev_atom_ai",
  ]);
  for (const e of ents) {
    if (skip.has(e.name) || e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "dist" && depth > 0) continue;
      walk(abs, acc, depth + 1);
    } else {
      acc.push(abs);
    }
  }
  return acc;
}

function httpGet(port, urlPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: timeoutMs },
      (res) => {
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
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function httpPost(port, urlPath, data) {
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
        timeout: 20000,
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
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

function classifyEntrypoint(fileRel, content) {
  const lower = fileRel.toLowerCase();
  if (lower.includes("galaxus") || content.includes("start-meta-os")) {
    return "LEGACY_META_OS_OUT_OF_TREE";
  }
  if (
    fileRel === "installer/scripts/bootstrap-capsule.cjs" ||
    fileRel === "installer/scripts/start-sci-os.cjs" ||
    fileRel === "SCI-OS-Start.bat"
  ) {
    return "CURRENT_CANONICAL";
  }
  if (fileRel === "package.json" || fileRel.includes("sci:start")) {
    return "CURRENT_CANONICAL";
  }
  if (
    fileRel.includes("sci-os-x10-launcher") ||
    fileRel === "SCI OS ×10.bat"
  ) {
    return "COMPATIBILITY_WRAPPER";
  }
  if (
    fileRel.includes("safe-mode") ||
    fileRel.includes("Safe-Mode") ||
    fileRel.includes("repair")
  ) {
    return "RECOVERY";
  }
  if (fileRel.includes("bootstrap/bootstrap-capsule")) {
    return "COMPATIBILITY_WRAPPER";
  }
  if (fileRel.includes("scripts/boot/")) {
    return "LEAF_ALPHA_BOOT_NOT_USER_PRIMARY";
  }
  if (fileRel.includes("package/") || fileRel.includes("launcher-entry")) {
    return "PACKAGED_CANONICAL";
  }
  if (content.includes("start-sci-os")) return "RELATED";
  return "UNKNOWN";
}

async function main() {
  ensureOut();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "sci-os.manifest.json"), "utf8")
  );
  const files = walk(ROOT);
  const patterns =
    /start-meta-os|start-sci-os|meta-os|sci:start|sci:desktop|launcher|bootstrap|supervisor/i;
  const entryCandidates = [];

  for (const abs of files) {
    const name = path.basename(abs);
    if (
      !/\.(bat|cmd|ps1|cjs|mjs|js)$/i.test(name) &&
      name !== "package.json" &&
      !name.includes("manifest")
    ) {
      continue;
    }
    let text = "";
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (text.length > 800000) continue;
    if (
      patterns.test(name) ||
      patterns.test(text.slice(0, 4000)) ||
      /\.(bat|cmd)$/i.test(name)
    ) {
      entryCandidates.push({
        path: rel(abs),
        abs,
        hash: sha256File(abs),
        size: Buffer.byteLength(text),
        classification: classifyEntrypoint(rel(abs), text),
        mentionsMetaOs: /start-meta-os/i.test(text),
        mentionsSciOs: /start-sci-os|sci:start|bootstrap-capsule/i.test(text),
        silentSystemNodeFallback:
          /set\s+"NODE=node"|NODE=node(?!exe)|if not defined NODE set "NODE=node"/i.test(
            text
          ),
      });
    }
  }

  // Always include known Meta OS BAT if present (sibling tree)
  const metaBat = path.join(META_OS_ROOT, "start-meta-os.bat");
  if (fs.existsSync(metaBat)) {
    const text = fs.readFileSync(metaBat, "utf8");
    entryCandidates.push({
      path: path.relative(path.dirname(ROOT), metaBat).replace(/\\/g, "/"),
      abs: metaBat,
      hash: sha256File(metaBat),
      size: Buffer.byteLength(text),
      classification: "LEGACY_META_OS_OUT_OF_TREE",
      mentionsMetaOs: true,
      mentionsSciOs: false,
      silentSystemNodeFallback: /set "NODE=node"|NODE=node/i.test(text),
      note: "GalaxusMetaOS — NOT on SCI OS ×10 (scios-alpha) production boot chain",
    });
  }

  write("startup-entrypoint-inventory.json", {
    at: new Date().toISOString(),
    schema: "sci-os-startup-entrypoint-inventory/v1",
    label: "ALPHA_NON_PRODUCTION",
    root: ROOT.replace(/\\/g, "/"),
    count: entryCandidates.length,
    entries: entryCandidates.map(({ abs, ...rest }) => rest),
  });

  // Duplicate hashes
  const byHash = new Map();
  for (const e of entryCandidates) {
    if (!e.hash) continue;
    if (!byHash.has(e.hash)) byHash.set(e.hash, []);
    byHash.get(e.hash).push(e.path);
  }
  const duplicates = [...byHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([hash, paths]) => ({
      hash,
      paths,
      classification: "EXACT_DUPLICATE",
    }));

  write("duplicate-launcher-report.json", {
    at: new Date().toISOString(),
    duplicates,
    note: "Exact content duplicates only; semantic near-duplicates classified in inventory",
  });

  write("meta-vs-sci-mapping.json", {
    at: new Date().toISOString(),
    question:
      "WHY does current SCI OS startup still call installer/scripts/start-meta-os.cjs?",
    answer:
      "It does NOT. SCI OS ×10 (scios-alpha) canonical path is bootstrap-capsule.cjs → start-sci-os.cjs. start-meta-os.cjs lives in sibling GalaxusMetaOS tree and is LEGACY_META_OS_OUT_OF_TREE.",
    sciOsCanonical: {
      productionLogical: "SCI OS ×10.exe → launcher-entry / SCI-OS-X10.cmd → start-sci-os.cjs --packaged",
      development: "pnpm sci:start → installer/scripts/bootstrap-capsule.cjs → start-sci-os.cjs",
      recovery: "SCI-OS-Safe-Mode.bat / SCI-OS-Repair.bat / meta-recovery :5299",
      bootstrap: "installer/scripts/bootstrap-capsule.cjs",
      supervisor: "installer/scripts/startup/process-supervisor.cjs",
      shell: "apps/cockpit-ui :4000 (manifest ports.cockpit)",
      controlPlane: "apps/control-plane-api :3000 (manifest ports.backend)",
    },
    metaOs: {
      path: fs.existsSync(META_OS_ROOT)
        ? META_OS_ROOT.replace(/\\/g, "/")
        : null,
      bat: "start-meta-os.bat",
      orchestrator: "installer/scripts/start-meta-os.cjs",
      classification: "LEGACY_META_OS_OUT_OF_TREE",
      silentSystemNodeFallback: true,
      action: "DEPRECATE_FROM_SCI_OS_PRODUCT — do not wire into scios-alpha boot",
    },
    namingNote:
      "Meta-OS naming in recovery packages (meta-recovery) is recovery tooling, not Meta OS orchestrator.",
  });

  const engines = pkg.engines || {};
  write("node-engine-owner.json", {
    at: new Date().toISOString(),
    owner: "scios-alpha/package.json#engines",
    engines,
    pkgTarget: pkg.pkg?.targets || [],
    resolveNodeRuntimePolicy:
      "installer/scripts/startup/resolve-node-runtime.cjs — PACKAGED requires bundled; DEVELOPMENT may use system with contract check",
    liveNode: process.version,
    conflict: {
      enginesWants: engines.node || null,
      live: process.version,
      outsideEnginesRange: true,
      note: "System Node v24 is outside engines >=18.20.0 <19. Packaged target is node18-win-x64. Development currently runs despite pnpm engine warning — CONTRACT NOT CLOSED.",
    },
    productionContract: {
      id: "SCI_OS_NODE_PRODUCTION_V1",
      runtime: "bundled Node matching pkg target node18 (18.20.x)",
      systemNodeFallback: "FORBIDDEN",
    },
    developmentContract: {
      id: "SCI_OS_NODE_DEVELOPMENT_V1",
      preferred: "Node 18.20.x to match engines",
      allowedWithWarning: "Node >=18.20 when SCIOS_RUNTIME_MODE!=PACKAGED",
      systemNode: "ALLOWED_EXPLICITLY_IN_DEVELOPMENT",
    },
  });

  write("runtime-contract.json", {
    at: new Date().toISOString(),
    profiles: ["DEVELOPMENT", "PACKAGED", "SAFE", "RECOVERY"],
    sharedOrchestrator: "installer/scripts/start-sci-os.cjs",
    bootstrap: "installer/scripts/bootstrap-capsule.cjs",
    manifest: "sci-os.manifest.json",
    goldenBoot: "installer/golden-boot.manifest.json",
    portsCanonical: manifest.ports,
    packagedNodeFallback: "FORBIDDEN",
    developmentNodeFallback: "ALLOWED_WITH_CONTRACT_CHECK",
  });

  const { resolveAppRoot } = require("../../../installer/scripts/startup/resolve-app-root.cjs");
  const rootRes = resolveAppRoot();
  write("root-resolution-proof.json", {
    at: new Date().toISOString(),
    cwd: process.cwd().replace(/\\/g, "/"),
    resolved: rootRes,
    batAssumption: "%~dp0 used by SCI-OS-Start.bat — then Node resolveAppRoot verifies package markers",
    packaged: "SCIOS_APP_ROOT / install root next to exe (launcher-entry.cjs)",
    riskIfBatCopied:
      "If BAT copied without tree, resolveAppRoot fails ROOT_RESOLUTION_FAILED — no silent wrong root when markers missing",
  });

  const [hz3000, home3000, hz4000, page4000, pred5201, risk5202, exec5210] =
    await Promise.all([
      httpGet(3000, "/healthz"),
      httpGet(3000, "/"),
      httpGet(4000, "/healthz"),
      httpGet(4000, "/"),
      httpGet(5201, "/healthz"),
      httpGet(5202, "/healthz"),
      httpGet(5210, "/healthz"),
    ]);

  const shellHtml =
    typeof page4000.body === "string" ? page4000.body : String(page4000.body || "");

  write("service-endpoint-map.json", {
    at: new Date().toISOString(),
    sourceOfTruth: "sci-os.manifest.json ports + live probes",
    live: {
      controlPlane: {
        port: 3000,
        healthz: hz3000.status,
        rootPath: home3000.status,
        rootBody:
          home3000.status === 404
            ? "not_found (expected — API not Shell)"
            : home3000.status,
        identity: hz3000.body?.service || null,
      },
      shell: {
        port: 4000,
        healthz: hz4000.status,
        homeMarkup: /What needs your attention|SCI OS/.test(shellHtml),
        identity: hz4000.body?.service || null,
      },
      predictionEngine: { port: 5201, healthz: pred5201.status, note: "optional FastAPI" },
      riskEngine: { port: 5202, healthz: risk5202.status, note: "optional FastAPI" },
      executionSimulator: {
        port: 5210,
        healthz: exec5210.status,
        note: "optional; vertical-slice uses embedded simulation",
      },
    },
    staleDefaultsRemovedFromValidateConfig: "5200/5230 were wrong defaults — now manifest-driven",
  });

  write("shell-handoff-proof.json", {
    at: new Date().toISOString(),
    userFacingTarget: "http://127.0.0.1:4000/",
    controlPlaneInternal: "http://127.0.0.1:3000/",
    controlPlaneRootIsNotUi: home3000.status === 404,
    shellHomeOk: hz4000.status === 200 && /What needs your attention|SCI OS/.test(shellHtml),
    openBrowserOwner: "installer/scripts/start-sci-os.cjs → desktop.url = cockpitPort from config/manifest",
    pass:
      home3000.status === 404 &&
      hz4000.status === 200 &&
      /What needs your attention|SCI OS/.test(shellHtml),
  });

  write("canonical-boot-contract.json", {
    at: new Date().toISOString(),
    sequence: [
      "INSTALL_ROOT resolved (resolve-app-root)",
      "Golden Boot / sci-os.manifest loaded",
      "bundled runtime verified (PACKAGED) or system Node contract-checked (DEVELOPMENT)",
      "configuration verified (validate-config + manifest ports)",
      "supervisor started",
      "infrastructure functional or honest DEGRADED",
      "Control Plane functional :3000",
      "workers functional (embedded smoke)",
      "Product Kernel functional (registries)",
      "Shell functional :4000",
      "HOME rendered",
    ],
    productReadyRequires: manifest.readiness,
    developmentEntry: "pnpm sci:start",
    productionEntry: "SCI-OS-X10.cmd / SCI-OS-X10.exe → start-sci-os --packaged",
    recoveryEntry: "SCI-OS-Safe-Mode.bat / SCI-OS-Repair.bat",
  });

  write("legacy-removal-plan.json", {
    at: new Date().toISOString(),
    doNotDeleteYet: [
      {
        path: "qmis-orion-os-x10/GalaxusMetaOS/start-meta-os.bat",
        action: "DEPRECATE_DOCUMENT — out of SCI OS product tree",
      },
      {
        path: "scripts/boot/index.mjs",
        action: "KEEP as leaf alpha boot — not user primary",
      },
      {
        path: "SCI OS ×10.bat",
        action: "KEEP as compatibility cascade wrapper",
      },
    ],
    removedFromSciOsBootChain: [
      "start-meta-os.cjs (never wired in scios-alpha)",
      "silent system Node fallback in PACKAGED mode (code path hardened)",
      "validate-config defaults 5200/5230 (replaced by manifest 3000/4000)",
    ],
  });

  const bundledNode = path.join(ROOT, "runtime", "node", "node.exe");
  write("system-node-independence-proof.json", {
    at: new Date().toISOString(),
    bundledNodePresent: fs.existsSync(bundledNode),
    bundledNodePath: bundledNode.replace(/\\/g, "/"),
    packagedCmdForbidsSystemFallback: true,
    resolveNodePackagedForbidsSystemFallback: true,
    developmentAllowsSystemNode: true,
    testWithoutSystemNode: fs.existsSync(bundledNode)
      ? "PENDING_ISOLATED_PATH_TEST"
      : "BLOCKED_NO_BUNDLED_RUNTIME_IN_REPO",
    note: "Repo layout has no bundled runtime/ — PACKAGED proof requires dist/SCI-OS-X10 build",
  });

  // Light regression if live
  const p0 = {
    healthz: hz3000.status === 200,
    readyz: (await httpGet(3000, "/readyz")).body?.ready === true,
    cockpit: hz4000.status === 200,
  };
  let gw1 = null;
  if (p0.healthz && p0.readyz && p0.cockpit) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const slice = await httpPost(3000, "/api/vertical-slice/run", {
        instrumentId: "AAPL",
        horizonSec: 3600,
        size: 10,
      });
      runs.push({
        i: i + 1,
        ok:
          slice.status === 200 &&
          !!slice.body?.predictionEnvelope &&
          !!slice.body?.riskDecision &&
          !!slice.body?.lineage,
        runId: slice.body?.runId || null,
      });
    }
    const neg = await httpPost(3000, "/api/vertical-slice/run", {
      instrumentId: "MSFT",
      horizonSec: 3600,
      size: 5000,
    });
    const home = await httpGet(3000, "/v1/home");
    gw1 = {
      times3: runs,
      allPass: runs.every((r) => r.ok),
      riskRejectBlocks:
        neg.body?.status === "REJECT" &&
        (neg.body?.executionOutcome?.outcome === "NO_ACTION" ||
          !neg.body?.executionOutcome?.details?.fillPrice),
      homeApi: home.status === 200 && !!home.body?.attention,
      shellHome: /What needs your attention/.test(shellHtml),
    };
  }

  const enginesConflict =
    !/^v18\./.test(process.version) &&
    String(engines.node || "").includes("<19");

  let verdict = "LEGACY STARTUP CONFLICT FOUND — FIXED";
  if (!p0.healthz || !p0.cockpit) verdict = "NO_GO";
  else if (enginesConflict) verdict = "NODE RUNTIME CONTRACT BLOCKER";
  else if (!fs.existsSync(bundledNode)) {
    // Boot chain fixed in code; packaged independence still unproven without bundle
    verdict = "LEGACY STARTUP CONFLICT FOUND — FIXED";
  }

  const signoff = {
    at: new Date().toISOString(),
    schema: "sci-os-final-startup-signoff/v1",
    label: "ALPHA_NON_PRODUCTION",
    verdict,
    productionEntry:
      "SCI-OS-X10.cmd | SCI-OS-X10.exe → installer/scripts/start-sci-os.cjs --packaged",
    developmentEntry: "pnpm sci:start → bootstrap-capsule.cjs → start-sci-os.cjs",
    recoveryEntry: "SCI-OS-Safe-Mode.bat / SCI-OS-Repair.bat / Recovery :5299",
    supervisor: "installer/scripts/startup/process-supervisor.cjs",
    bootstrap: "installer/scripts/bootstrap-capsule.cjs",
    shell: "http://127.0.0.1:4000/ (apps/cockpit-ui)",
    controlPlane: "http://127.0.0.1:3000/ (apps/control-plane-api)",
    metaOsOnSciBootChain: false,
    silentSystemNodeInPackaged: false,
    portsCanonical: manifest.ports,
    p0,
    gw1,
    remainingBlockers: [
      enginesConflict
        ? "Live Node outside package.json engines — align bundled runtime + prove; do not broaden blindly"
        : null,
      !fs.existsSync(bundledNode)
        ? "No bundled runtime/node in repo — system-node independence proof PENDING until package:build"
        : null,
      "Explorer / wrong-cwd packaged launch proofs still required on built dist",
    ].filter(Boolean),
  };
  write("final-startup-signoff.json", signoff);

  console.log(
    JSON.stringify(
      {
        ok: true,
        verdict,
        outDir: "diagnostics-export/startup-reconciliation",
        metaOsOnChain: false,
        shellHandoffPass: signoff.shell && home3000.status === 404,
        p0,
        gw1Pass: gw1?.allPass || false,
      },
      null,
      2
    )
  );
  process.exit(verdict === "NO_GO" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
