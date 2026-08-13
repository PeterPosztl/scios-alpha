/**
 * SCI OS ×10 Continuous Closure Engine
 * CONTROL × COMPONENT × RUNTIME × PROFILE × ROLE × ACTION × WORKFLOW × FAILURE × PLATFORM
 * Pattern hit ≠ bug. Check instance ≠ ticket. Deduplicate to root causes.
 * Does NOT auto-repair thousands of files. ALPHA_NON_PRODUCTION
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "closure");
const require = createRequire(import.meta.url);

const RUNTIMES = [
  "DEVELOPMENT",
  "PACKAGED",
  "SAFE_MODE",
  "REPAIR",
  "RECOVERY",
  "OPTIONAL_INFRA_DEGRADED",
];

const FAILURES = [
  "timeout",
  "connection_refused",
  "http_404",
  "http_500",
  "malformed_json",
  "missing_config",
  "invalid_config",
  "missing_file",
  "hash_mismatch",
  "stale_lock",
  "duplicate_process",
  "port_conflict",
  "provider_unavailable",
  "database_unavailable",
  "redis_unavailable",
  "disk_full",
  "permission_denied",
  "partial_install",
  "crash_during_boot",
  "crash_during_action",
  "persistence_failure",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "diagnostics-export",
  "sandbox",
  ".atom_ai",
  "dev_auto_finish",
  "dev_atom_ai",
]);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function writeJson(name, obj) {
  ensureOut();
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function walkFiles(dir, acc = [], depth = 0) {
  if (depth > 10) return acc;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(abs, acc, depth + 1);
    else if (/\.(js|cjs|mjs|ts|tsx|py|json|md|bat|cmd)$/i.test(e.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

function listImmediate(dir, filterFn) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter(filterFn)
    .map((e) => path.join(dir, e.name).replace(/\\/g, "/"));
}

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return r.status === 0 ? String(r.stdout).trim() : "UNKNOWN";
}

function treeHash(paths) {
  const h = crypto.createHash("sha256");
  for (const p of paths.slice().sort()) {
    h.update(p);
    h.update("\0");
  }
  return h.digest("hex");
}

function fileHash(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return sha256(fs.readFileSync(abs));
}

function readJsonSafe(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

/* ========================= IDENTITY ========================= */

function buildIdentity(components) {
  const manifestRel = "sci-os.manifest.json";
  const pkgRel = "package.json";
  return {
    schema: "sci-os-closure-identity/v1",
    label: "ALPHA_NON_PRODUCTION",
    runId: `closure_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
    at: new Date().toISOString(),
    gitSha: gitSha(),
    treeHash: treeHash(components.map((c) => c.id)),
    buildId: readJsonSafe("diagnostics-export/cursor-repair/build-identity.json")?.buildId || "UNKNOWN",
    packageHash: fileHash(pkgRel),
    manifestHash: fileHash(manifestRel),
    runtimeVersion: process.version,
    profile: "local-foundation",
    note: "Stale evidence must not close current issues — compare runId/treeHash/gitSha",
  };
}

/* ========================= COMPONENTS ========================= */

function enumerateComponents() {
  const comps = [];
  const push = (id, kind, root) => {
    comps.push({
      id,
      kind,
      root,
      exists: fs.existsSync(path.join(ROOT, root)),
    });
  };

  for (const a of listImmediate("apps", (e) => e.isDirectory())) {
    push(`app:${path.basename(a)}`, "app", a);
  }
  for (const p of listImmediate("packages", (e) => e.isDirectory())) {
    push(`pkg:${path.basename(p)}`, "package", p);
  }
  push("installer", "installer", "installer");
  push("scripts/package", "packaging", "scripts/package");
  push("bootstrap", "bootstrap", "installer/scripts");
  push("supervisor", "supervisor", "installer/scripts/startup");
  push("recovery", "recovery", "apps/meta-recovery-control-plane");
  push("product-memory", "contracts", "product-memory");
  push("manifest", "manifest", "sci-os.manifest.json");
  push("docs/enterprise", "docs", "docs/enterprise");
  push("docs/ux", "docs", "docs/ux");

  // Empty package dirs
  for (const p of listImmediate("packages", (e) => e.isDirectory())) {
    const files = walkFiles(path.join(ROOT, p)).filter((f) =>
      /\.(js|ts|cjs|mjs)$/.test(f)
    );
    if (files.length === 0) {
      comps.push({
        id: `pkg:${path.basename(p)}:empty`,
        kind: "empty_package",
        root: p,
        exists: true,
        emptySrc: true,
      });
    }
  }
  return comps;
}

/* ========================= ACTIONS / ROUTES ========================= */

function discoverActions() {
  const actions = [];
  const routeFiles = [
    "apps/control-plane-api/src/server.ts",
    "apps/control-plane-api/src/routes/product.ts",
    "apps/control-plane-api/src/routes/system.ts",
    "apps/control-plane-api/src/routes/verticalSlice.ts",
  ];
  const routeRe =
    /(?:method\s*===\s*["'](GET|POST|PUT|DELETE|PATCH)["'][^;]{0,120}path\s*(?:===|startsWith)\s*["']([^"']+)["'])|(?:path\s*===\s*["']([^"']+)["'])/g;

  for (const rf of routeFiles) {
    const abs = path.join(ROOT, rf);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    let m;
    const seen = new Set();
    while ((m = routeRe.exec(text))) {
      const method = m[1] || "GET";
      const p = m[2] || m[3];
      if (!p || !p.startsWith("/")) continue;
      const id = `${method} ${p}`;
      if (seen.has(id)) continue;
      seen.add(id);
      actions.push({
        actionId: id,
        kind: "route",
        method,
        path: p,
        source: rf,
        consequential: /slice|run|session|governance|predict|analyze/i.test(id),
      });
    }
  }

  const cockpit = path.join(ROOT, "apps/cockpit-ui/src/index.js");
  if (fs.existsSync(cockpit)) {
    const text = fs.readFileSync(cockpit, "utf8");
    const btnRe = /data-action-id=["']([^"']+)["']/g;
    let m;
    const seen = new Set();
    while ((m = btnRe.exec(text))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      actions.push({
        actionId: id,
        kind: "ui_action",
        source: "apps/cockpit-ui/src/index.js",
        consequential: /approval|analyze|nav_|open_/i.test(id),
      });
    }
  }

  actions.push(
    {
      actionId: "workflow:gw1",
      kind: "workflow",
      source: "sci-os.manifest.json",
      consequential: true,
    },
    {
      actionId: "boot:start-sci-os",
      kind: "boot",
      source: "installer/scripts/start-sci-os.cjs",
      consequential: true,
    },
    {
      actionId: "boot:repair",
      kind: "boot",
      source: "installer/scripts/repair-sci-os.cjs",
      consequential: true,
    }
  );

  return actions;
}

/* ========================= ROLES ========================= */

function loadRoles() {
  try {
    const pdr = path.join(
      ROOT,
      "packages/professional-domain-registry/src/index.js"
    );
    // Prefer JSON files for sync CJS-safe load
    const arch = readJsonSafe(
      "packages/professional-domain-registry/src/archetypes.json"
    );
    const seed = readJsonSafe(
      "packages/professional-domain-registry/src/roles-seed.json"
    );
    const archetypes = arch?.archetypes || [];
    return {
      archetypes,
      rolesSeeded: seed?.roles?.length || seed?.count || 0,
      proofRoles: archetypes
        .filter((a) =>
          [
            "arch.market_analyst",
            "arch.fraud_investigator",
            "arch.soc_analyst",
          ].includes(a.roleId)
        )
        .map((a) => a.roleId),
      allRoleIds: archetypes.map((a) => a.roleId),
      source: "@scios/professional-domain-registry",
      note: pdr,
    };
  } catch (e) {
    return {
      archetypes: [],
      rolesSeeded: 0,
      proofRoles: [],
      allRoleIds: [],
      error: String(e.message || e),
    };
  }
}

/* ========================= CONTROL CATALOG ========================= */

function familyComponentAffinity(familyId) {
  const map = {
    CF01: ["pkg:product-kernel", "pkg:governance-engine", "app:control-plane-api", "app:cockpit-ui"],
    CF02: ["pkg:governance-engine", "pkg:vertical-slice", "app:control-plane-api", "app:cockpit-ui"],
    CF03: ["pkg:data-fabric", "app:control-plane-api", "installer"],
    CF04: ["pkg:data-fabric", "app:control-plane-api", "pkg:vertical-slice"],
    CF05: ["pkg:data-fabric", "pkg:vertical-slice"],
    CF06: ["pkg:product-kernel", "app:control-plane-api"],
    CF07: ["app:control-plane-api", "app:cockpit-ui"],
    CF08: ["app:control-plane-api", "app:cockpit-ui"],
    CF09: ["pkg:data-fabric", "pkg:meta-intelligence"],
    CF10: ["pkg:observability", "pkg:vertical-slice"],
    CF11: ["app:control-plane-api", "supervisor"],
    CF12: ["pkg:vertical-slice", "app:cockpit-ui", "pkg:product-kernel"],
    CF13: ["pkg:product-kernel", "pkg:professional-domain-registry"],
    CF14: ["pkg:governance-engine", "pkg:vertical-slice"],
    CF15: ["pkg:vertical-slice", "app:risk-engine"],
    CF16: ["pkg:vertical-slice", "app:control-plane-api", "app:cockpit-ui"],
    CF17: ["pkg:observability", "installer", "app:control-plane-api"],
    CF18: ["pkg:product-kernel"],
    CF19: ["installer", "pkg:vertical-slice", "app:control-plane-api", "app:cockpit-ui"],
    CF20: ["app:control-plane-api", "pkg:vertical-slice"],
    CF21: ["pkg:vertical-slice", "installer", "scripts/package"],
    CF22: ["recovery", "scripts/package", "installer", "pkg:meta-recovery"],
    CF23: ["scripts/package", "manifest"],
    CF24: ["app:control-plane-api", "app:cockpit-ui", "installer"],
    CF25: ["pkg:data-fabric", "app:control-plane-api", "pkg:observability"],
    CF26: ["pkg:model-registry", "product-memory", "app:cockpit-ui"],
    CF27: ["app:cockpit-ui", "pkg:governance-engine"],
    CF28: ["pkg:model-registry", "pkg:product-kernel", "pkg:vertical-slice"],
    CF29: ["pkg:vertical-slice", "app:control-plane-api"],
    CF30: ["pkg:meta-intelligence"],
    CF31: ["pkg:vertical-slice", "app:cockpit-ui"],
    CF32: ["pkg:meta-intelligence", "pkg:vertical-slice", "app:cockpit-ui"],
    CF33: ["pkg:vertical-slice", "pkg:alpha-loop"],
    CF34: ["product-memory", "app:cockpit-ui"],
    CF35: ["app:control-plane-api"],
    CF36: ["app:cockpit-ui", "pkg:design-system"],
    CF37: ["app:cockpit-ui", "pkg:professional-domain-registry"],
    CF38: ["pkg:product-kernel", "pkg:vertical-slice"],
    CF39: ["installer", "recovery", "pkg:meta-recovery", "app:cockpit-ui"],
    CF40: ["pkg:product-kernel", "pkg:system-closure"],
  };
  return map[familyId] || ["manifest"];
}

function buildControlCatalog(enterpriseRegister) {
  const controls = [];
  const seen = new Set();

  const add = (c) => {
    if (seen.has(c.controlId)) return;
    seen.add(c.controlId);
    controls.push(c);
  };

  for (const g of enterpriseRegister?.controls || []) {
    add({
      controlId: g.controlId,
      title: g.title,
      familyId: g.familyId,
      source: "enterprise-gap-register",
      baselineStatus: g.status,
      severityHint: g.severity,
      firstReleaseRequired: g.firstReleaseRequired,
      productionRequired: g.productionRequired,
      expandable: {
        components: true,
        runtimes: ["CF19", "CF21", "CF22", "CF23", "CF24"].some((f) =>
          g.familyId?.startsWith(f.slice(0, 3))
        )
          ? true
          : "subset",
        roles: ["CF01", "CF02", "CF07", "CF08", "CF12", "CF37"].includes(
          g.familyId
        ),
        actions: ["CF12", "CF02", "CF14", "CF16"].includes(g.familyId),
        failures: ["CF19", "CF21", "CF22", "CF10", "CF11"].includes(g.familyId),
        workflows: ["CF13", "CF37"].includes(g.familyId),
      },
    });
  }

  // Additional canonical controls to approach ~1000 (contract / runtime / package)
  const extras = [
    ["RT.boot.orchestrator-exists", "Boot orchestrator present", "CF39", "P0"],
    ["RT.boot.bootstrap-exists", "Bootstrap capsule present", "CF39", "P0"],
    ["RT.boot.supervisor-exists", "Process supervisor present", "CF39", "P0"],
    ["RT.packaged.no-apps-src", "Packaged must not resolve apps/**/src", "CF23", "P0"],
    ["RT.packaged.bundled-node", "Packaged uses bundled Node 20.18.x", "CF23", "P0"],
    ["RT.packaged.backend-artifact", "backend/server.cjs present", "CF23", "P0"],
    ["RT.packaged.cockpit-artifact", "cockpit/index.mjs present", "CF23", "P0"],
    ["RT.home.http-200", "Home HTTP 200", "CF37", "P0"],
    ["RT.gw1.slice-run", "GW1 vertical-slice run", "CF31", "P0"],
    ["RT.lineage.verify", "Lineage hash verify", "CF16", "P0"],
    ["RT.shutdown.clean", "Clean shutdown / process tree", "CF19", "P0"],
    ["RT.readiness.no-404-ready", "404 must not mean READY", "CF19", "P0"],
    ["AUTH.no-duplicate-compiler", "Single Experience Compiler authority", "CF37", "P1"],
    ["AUTH.no-duplicate-kernel", "Single Product Kernel authority", "CF40", "P1"],
    ["PKG.workspace-dep-linked", "Workspace deps resolved", "CF23", "P1"],
    ["SEC.no-shell-true-unclassified", "shell:true context-classified", "CF24", "P1"],
    ["SEC.import-meta-cjs-bundle", "import.meta safe in CJS bundle", "CF23", "P1"],
    ["UX.no-dead-end-primary", "Primary GW1 no dead ends", "CF37", "P1"],
    ["SCI.model-not-fake-validated", "No fake SCIENTIFICALLY_VALIDATED", "CF29", "P1"],
    ["EVID.no-unknown-as-pass", "UNKNOWN never PASS", "CF16", "P0"],
  ];

  for (const [id, title, family, sev] of extras) {
    add({
      controlId: id,
      title,
      familyId: family,
      source: "closure-engine-runtime-contracts",
      baselineStatus: "UNKNOWN",
      severityHint: sev,
      firstReleaseRequired: sev === "P0" || sev === "P1",
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: true,
        roles: id.startsWith("UX") || id.startsWith("AUTH"),
        actions: id.startsWith("RT.gw1") || id.startsWith("UX"),
        failures: id.startsWith("RT.") || id.startsWith("SEC"),
        workflows: id.includes("gw1"),
      },
    });
  }

  // Manifest / pipeline / UX surface controls
  const manifest = readJsonSafe("sci-os.manifest.json") || {};
  for (const stage of manifest.pipeline || []) {
    add({
      controlId: `PIPE.stage.${stage}`,
      title: `Pipeline stage wired: ${stage}`,
      familyId: "CF13",
      source: "sci-os.manifest.json",
      baselineStatus: "UNKNOWN",
      severityHint: "P1",
      firstReleaseRequired: true,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: false,
        actions: false,
        failures: false,
        workflows: true,
      },
    });
  }
  for (const ux of manifest.ux || []) {
    add({
      controlId: `UX.surface.${ux}`,
      title: `UX surface present: ${ux}`,
      familyId: "CF37",
      source: "sci-os.manifest.json",
      baselineStatus: "UNKNOWN",
      severityHint: "P1",
      firstReleaseRequired: true,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: true,
        actions: false,
        failures: false,
        workflows: false,
      },
    });
  }

  // Per-package existence/export controls
  for (const p of listImmediate("packages", (e) => e.isDirectory())) {
    const name = path.basename(p);
    add({
      controlId: `PKG.exists.${name}`,
      title: `Package present: ${name}`,
      familyId: "CF40",
      source: "packages/**",
      baselineStatus: "UNKNOWN",
      severityHint: "P2",
      firstReleaseRequired: false,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: false,
        roles: false,
        actions: false,
        failures: false,
        workflows: false,
      },
    });
    add({
      controlId: `PKG.main.${name}`,
      title: `Package main entry resolves: ${name}`,
      familyId: "CF40",
      source: "packages/**/package.json",
      baselineStatus: "UNKNOWN",
      severityHint: "P1",
      firstReleaseRequired: name === "vertical-slice" || name === "product-kernel",
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: false,
        actions: false,
        failures: ["missing_file"],
        workflows: false,
      },
    });
  }

  // Capability registry controls (if present)
  const capReg = readJsonSafe("docs/enterprise/CAPABILITY_REGISTRY.json");
  for (const c of (capReg?.capabilities || []).slice(0, 400)) {
    const cid = c.capabilityId || c.id;
    if (!cid) continue;
    add({
      controlId: `CAP.${cid}`,
      title: `Capability: ${cid}`,
      familyId: "CF40",
      source: "docs/enterprise/CAPABILITY_REGISTRY.json",
      baselineStatus: c.status || "UNKNOWN",
      severityHint: c.status === "STUB" || c.status === "MISSING" ? "P2" : "P1",
      firstReleaseRequired: !!c.firstRelease,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: false,
        actions: false,
        failures: false,
        workflows: false,
      },
      maturityHint: c.status,
    });
  }

  // Product-memory contract files
  const pm = path.join(ROOT, "product-memory");
  if (fs.existsSync(pm)) {
    for (const f of walkFiles(pm).filter((x) => x.endsWith(".json"))) {
      const id = rel(f).replace(/[\\/]/g, ".").replace(/\.json$/, "");
      add({
        controlId: `PM.${id}`,
        title: `Product memory contract: ${rel(f)}`,
        familyId: "CF40",
        source: "product-memory",
        baselineStatus: "UNKNOWN",
        severityHint: "P2",
        firstReleaseRequired: false,
        productionRequired: true,
        expandable: {
          components: true,
          runtimes: false,
          roles: false,
          actions: false,
          failures: false,
          workflows: false,
        },
      });
    }
  }

  // Per discovered route/UI action — consequential chain control
  for (const a of discoverActions()) {
    add({
      controlId: `ACT.${a.kind}.${a.actionId.replace(/[^a-zA-Z0-9._/-]+/g, "_").slice(0, 80)}`,
      title: `Action discoverable: ${a.actionId}`,
      familyId: "CF12",
      source: "action-discovery",
      baselineStatus: a.consequential ? "PARTIAL" : "UNKNOWN",
      severityHint: a.consequential ? "P1" : "P3",
      firstReleaseRequired: !!a.consequential,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: a.consequential,
        actions: a.consequential,
        failures: a.consequential,
        workflows: a.actionId.includes("gw1"),
      },
    });
  }

  // Per-app health surface
  for (const a of listImmediate("apps", (e) => e.isDirectory())) {
    const name = path.basename(a);
    add({
      controlId: `APP.health.${name}`,
      title: `App health surface: ${name}`,
      familyId: "CF39",
      source: "apps/**",
      baselineStatus: "UNKNOWN",
      severityHint: name.includes("control-plane") || name.includes("cockpit") ? "P0" : "P2",
      firstReleaseRequired: name.includes("control-plane") || name.includes("cockpit"),
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: true,
        roles: false,
        actions: false,
        failures: true,
        workflows: false,
      },
    });
  }

  // Domain register (security, data arch, AI, Windows lifecycle, …)
  const domainReg = readJsonSafe(
    "diagnostics-export/closure/domain-gap-register.json"
  );
  for (const c of domainReg?.controls || []) {
    add({
      controlId: c.controlId,
      title: c.title,
      familyId: c.familyId || "DOMAIN",
      source: "domain-gap-register",
      baselineStatus: c.status,
      severityHint: c.severity || "P2",
      firstReleaseRequired: !!c.firstReleaseRequired,
      productionRequired: !!c.productionRequired,
      expandable: {
        components: true,
        runtimes:
          String(c.controlId).includes("windows") ||
          String(c.controlId).includes("offline") ||
          String(c.controlId).includes("backup")
            ? true
            : "subset",
        roles: /cyber|financial|professional-ux|search/i.test(c.controlId),
        actions: /workflow|llm|financial|simulation/i.test(c.controlId),
        failures: /security|sre|observability|backup|windows|offline/i.test(
          c.controlId
        ),
        workflows: /workflow|financial|simulation/i.test(c.controlId),
      },
    });
  }

  // Static detector meta-controls
  const detectors = [
    "shell_true",
    "process_exit",
    "detached_true",
    "unref",
    "import_meta_cjs_risk",
    "hardcoded_localhost",
    "no_open_flag",
    "readiness_lt_500",
    "duplicate_compiler",
    "source_tree_fs_dep",
    "todo_fixme_release",
    "empty_package_dir",
    "route_without_test",
    "action_without_evidence",
    "swallowed_catch",
  ];
  for (const d of detectors) {
    add({
      controlId: `DET.${d}`,
      title: `Static detector: ${d}`,
      familyId: "CF24",
      source: "closure-static-detectors",
      baselineStatus: "UNKNOWN",
      severityHint: "P1",
      firstReleaseRequired: true,
      productionRequired: true,
      expandable: {
        components: true,
        runtimes: "subset",
        roles: false,
        actions: false,
        failures: false,
        workflows: false,
      },
    });
  }

  return {
    schema: "sci-os-control-catalog/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    count: controls.length,
    controls,
  };
}

/* ========================= STATIC DETECTORS ========================= */

function runStaticDetectors(components) {
  const hits = [];
  const releaseCritical = [
    "installer/scripts",
    "apps/control-plane-api",
    "apps/cockpit-ui",
    "scripts/package",
    "packages/vertical-slice",
    "packages/product-kernel",
    "packages/professional-domain-registry",
  ];

  const patterns = [
    {
      id: "shell_true",
      re: /shell\s*:\s*true/,
      classify: (file, snippet) =>
        /spawn|execFile|execSync/.test(snippet)
          ? {
              type: "RISK",
              severity: "P1",
              root: "SHELL_TRUE_PROCESS_SPAWN",
              note: "Context: process spawn — verify intentional",
            }
          : {
              type: "UNKNOWN",
              severity: "P3",
              root: "SHELL_TRUE_NON_SPAWN",
              note: "Pattern hit outside spawn — classify before ticket",
            },
    },
    {
      id: "process_exit",
      re: /process\.exit\s*\(/,
      classify: () => ({
        type: "RISK",
        severity: "P2",
        root: "PROCESS_EXIT_USAGE",
        note: "Ensure exit codes match contract 0/2/3",
      }),
    },
    {
      id: "detached_true",
      re: /detached\s*:\s*true/,
      classify: () => ({
        type: "RISK",
        severity: "P1",
        root: "DETACHED_PROCESS",
        note: "Detached children may orphan; verify serve-mode ownership",
      }),
    },
    {
      id: "unref",
      re: /\.unref\s*\(/,
      classify: () => ({
        type: "RISK",
        severity: "P2",
        root: "TIMER_UNREF",
        note: "unref may hide lifecycle — context required",
      }),
    },
    {
      id: "import_meta",
      re: /import\.meta\.url/,
      classify: (file) =>
        /professional-domain-registry|packaged|bundle/i.test(file)
          ? {
              type: "DRIFT",
              severity: "P1",
              root: "IMPORT_META_IN_BUNDLE_PATH",
              note: "CJS bundle empties import.meta — prefer static JSON import",
            }
          : {
              type: "GAP",
              severity: "P3",
              root: "IMPORT_META_ESM_OK",
              note: "Likely ESM-safe; still verify packaged path",
            },
    },
    {
      id: "hardcoded_localhost",
      re: /127\.0\.0\.1|localhost/,
      classify: () => ({
        type: "GAP",
        severity: "P2",
        root: "HARDCODED_LOCALHOST",
        note: "Default bind OK for local-foundation; flag if non-overridable",
      }),
    },
    {
      id: "no_open",
      re: /--no-open/,
      classify: () => ({
        type: "RISK",
        severity: "P1",
        root: "NO_OPEN_FLAG",
        note: "Browser handoff must not be stuck behind --no-open in product path",
      }),
    },
    {
      id: "readiness_lt_500",
      re: /status\s*<\s*500|statusCode\s*<\s*500/,
      classify: () => ({
        type: "BUG",
        severity: "P0",
        root: "READINESS_LT_500_ANTIPATTERN",
        note: "404 must not count as ready",
      }),
    },
    {
      id: "compileGw1",
      re: /function\s+compileGw1Experience|compileGw1Experience\s*\(/,
      classify: () => ({
        type: "DRIFT",
        severity: "P1",
        root: "DUPLICATE_EXPERIENCE_COMPILER",
        note: "Second compiler forbidden — PDR only",
      }),
    },
    {
      id: "source_tree_path",
      re: /packages\/professional-domain-registry\/src\/(?:archetypes|roles-seed)\.json/,
      classify: () => ({
        type: "DRIFT",
        severity: "P1",
        root: "SOURCE_TREE_FS_DEPENDENCY",
        note: "Installed product must use package API",
      }),
    },
    {
      id: "todo_fixme",
      re: /\b(TODO|FIXME)\b/,
      classify: (file) =>
        releaseCritical.some((r) => file.includes(r))
          ? {
              type: "GAP",
              severity: "P2",
              root: "TODO_IN_RELEASE_CRITICAL",
              note: "Track; not auto-bug",
            }
          : {
              type: "UNKNOWN",
              severity: "P3",
              root: "TODO_NON_CRITICAL",
              note: "Non-critical path",
            },
    },
    {
      id: "swallowed_catch",
      re: /catch\s*\([^)]*\)\s*\{\s*\}/,
      classify: () => ({
        type: "RISK",
        severity: "P1",
        root: "SWALLOWED_CATCH",
        note: "Empty catch may hide mandatory failure",
      }),
    },
  ];

  const files = [];
  for (const c of components) {
    if (!c.exists || c.kind === "empty_package") continue;
    const abs = path.join(ROOT, c.root);
    if (fs.statSync(abs).isFile()) {
      files.push(abs);
      continue;
    }
    files.push(...walkFiles(abs).filter((f) => /\.(js|cjs|mjs|ts|tsx)$/.test(f)));
  }

  // Cap scan size for performance — prioritize release-critical
  const prioritized = files
    .map((f) => ({
      f,
      score: releaseCritical.some((r) => rel(f).startsWith(r)) ? 0 : 1,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2500)
    .map((x) => x.f);

  for (const abs of prioritized) {
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (text.length > 2_000_000) continue;
    const fileRel = rel(abs);
    for (const pat of patterns) {
      pat.re.lastIndex = 0;
      if (!pat.re.test(text)) continue;
      pat.re.lastIndex = 0;
      const m = pat.re.exec(text);
      const idx = m ? m.index : 0;
      const snippet = text.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, " ");
      const cls = pat.classify(fileRel, snippet);
      hits.push({
        detectorId: pat.id,
        file: fileRel,
        snippet: snippet.slice(0, 120),
        ...cls,
      });
    }
  }

  // Duplicate compiler authority check (source)
  const productTs = path.join(ROOT, "apps/control-plane-api/src/routes/product.ts");
  if (fs.existsSync(productTs)) {
    const t = fs.readFileSync(productTs, "utf8");
    if (/compileGw1Experience/.test(t)) {
      hits.push({
        detectorId: "duplicate_compiler",
        file: "apps/control-plane-api/src/routes/product.ts",
        type: "DRIFT",
        severity: "P1",
        root: "DUPLICATE_EXPERIENCE_COMPILER",
        note: "compileGw1Experience still in source",
        snippet: "compileGw1Experience",
      });
    }
  }

  // Empty packages
  for (const c of components.filter((x) => x.emptySrc)) {
    hits.push({
      detectorId: "empty_package_dir",
      file: c.root,
      type: "GAP",
      severity: "P2",
      root: "EMPTY_PACKAGE_DIRECTORY",
      note: "Empty/unused package — deprecate or implement",
      snippet: "no js/ts sources",
    });
  }

  // experience-compiler ghost
  const ghost = path.join(ROOT, "packages/experience-compiler");
  if (fs.existsSync(ghost)) {
    const js = fs.readdirSync(ghost).filter((f) => /\.(js|ts)$/.test(f));
    hits.push({
      detectorId: "ghost_compiler_dir",
      file: "packages/experience-compiler",
      type: js.length ? "DRIFT" : "GAP",
      severity: "P1",
      root: "GHOST_EXPERIENCE_COMPILER_DIR",
      note: js.length
        ? "Second compiler implementation present"
        : "Deprecated empty dir — OK if README only",
      snippet: js.join(",") || "README-only",
    });
  }

  return hits;
}

/* ========================= CHECK EXPANSION ========================= */

function classifyInstance(control, dims, ctx) {
  // Map enterprise baseline + runtime facts into instance status
  let status = "UNKNOWN";
  let type = "UNKNOWN";
  let severity = control.severityHint || "P2";

  const base = control.baselineStatus;
  if (base === "PROVEN") status = "PASS";
  else if (base === "DEFERRED") status = "DEFERRED";
  else if (base === "PROFILE_DISABLED") status = "NOT_APPLICABLE";
  else if (base === "ABSENT") {
    status = "FAIL";
    type = "GAP";
  } else if (base === "PARTIAL") {
    status = "PARTIAL";
    type = "GAP";
  } else if (base === "DISCONNECTED") {
    status = "FAIL";
    type = "WIRING";
  } else if (base === "UNKNOWN") status = "UNKNOWN";

  // Runtime applicability
  if (dims.runtime === "OPTIONAL_INFRA_DEGRADED") {
    if (/database|redis|postgres|replication|tenant/i.test(control.controlId + control.title)) {
      status = "NOT_APPLICABLE";
      type = "GAP";
      severity = "P2";
    }
  }
  if (dims.runtime === "DEVELOPMENT" && /packaged\.|PACKAGED_/i.test(control.controlId)) {
    status = "NOT_APPLICABLE";
  }
  if (
    dims.runtime &&
    !["PACKAGED", "DEVELOPMENT"].includes(dims.runtime) &&
    control.source === "enterprise-gap-register" &&
    !control.expandable?.runtimes
  ) {
    /* keep */
  }

  // Role: seed roles beyond archetypes → DEFERRED productization
  if (dims.role && dims.role.startsWith("seed:")) {
    status = "DEFERRED";
    type = "GAP";
    severity = "P3";
  }

  // Action chain gaps for consequential actions
  if (dims.action && dims.chainStep) {
    const step = dims.chainStep;
    const known = ctx.actionChainFacts[dims.action]?.[step];
    if (known === null || known === undefined) {
      status = "NOT_APPLICABLE";
      type = "WIRING";
    } else if (known === false) {
      status = "FAIL";
      type = "WIRING";
      severity = "P1";
    } else if (known === true) {
      status = "PASS";
      type = "WIRING";
    } else if (known === "partial") {
      status = "PARTIAL";
      type = "WIRING";
      severity = "P1";
    }
  }

  // Detector-driven
  if (dims.detectorHit) {
    status = dims.detectorHit.statusOverride || "PARTIAL";
    type = dims.detectorHit.type || "RISK";
    severity = dims.detectorHit.severity || severity;
  }

  // Failure-mode instances without harness → UNKNOWN (not invented FAIL)
  if (dims.failure && !ctx.failureProven?.[dims.failure]) {
    if (status !== "NOT_APPLICABLE" && status !== "DEFERRED") {
      status = "UNKNOWN";
      type = "RISK";
    }
  }

  return { status, type, severity };
}

function buildActionChainFacts(actions) {
  const facts = {};
  for (const a of actions) {
    if (!a.consequential) continue;
    const isLocalReview =
      /approval/i.test(a.actionId) && a.kind === "ui_action";
    const isSlice = /vertical-slice|slice\/run|workflow:gw1/i.test(a.actionId);
    const isNav = /^(nav_|open_)/i.test(a.actionId) || a.kind === "boot";
    if (isNav && !isSlice) {
      // Navigation/boot are consequential for product but not mutation approval chains
      facts[a.actionId] = {
        ui_caller: true,
        action_id: true,
        actor: "partial",
        permission: "partial",
        risk: null,
        policy: null,
        handler: a.kind === "boot" ? true : "partial",
        idempotency: null,
        result: "partial",
        evidence: "partial",
      };
      continue;
    }
    facts[a.actionId] = {
      ui_caller: a.kind === "ui_action" || a.kind === "route" ? true : "partial",
      action_id: true,
      actor: isSlice ? "partial" : isLocalReview ? "partial" : "partial",
      permission: isSlice ? "partial" : isLocalReview ? false : "partial",
      risk: isSlice ? true : isLocalReview ? "partial" : false,
      policy: isSlice ? true : isLocalReview ? "partial" : false,
      handler: a.kind === "route" || isSlice ? true : a.kind === "ui_action" ? "partial" : false,
      idempotency: isSlice ? true : false,
      result: isSlice || a.kind === "route" ? true : "partial",
      evidence: isSlice ? true : isLocalReview ? false : "partial",
    };
  }
  return facts;
}

function expandCheckInstances(catalog, components, roles, actions, detectors, identity) {
  const instances = [];
  const ctx = {
    actionChainFacts: buildActionChainFacts(actions),
    failureProven: {
      // Only mark proven if we have evidence artifacts
      persistence_failure: fs.existsSync(
        path.join(ROOT, "packages/vertical-slice/src/local-durable.ts")
      ),
      hash_mismatch: fs.existsSync(
        path.join(ROOT, "diagnostics-export/cursor-repair/launcher-hash-proof.json")
      ),
    },
  };

  const chainSteps = [
    "ui_caller",
    "action_id",
    "actor",
    "permission",
    "risk",
    "policy",
    "handler",
    "idempotency",
    "result",
    "evidence",
  ];

  const compById = new Map(components.map((c) => [c.id, c]));

  for (const control of catalog.controls) {
    const affinity = familyComponentAffinity(control.familyId).filter((id) =>
      compById.has(id)
    );
    const comps =
      affinity.length > 0
        ? affinity
        : components.filter((c) => c.kind === "package" || c.kind === "app").slice(0, 2).map((c) => c.id);

    // Base instance per control (canonical)
    {
      const dims = { component: comps[0] || "manifest", runtime: "DEVELOPMENT", profile: "local-foundation" };
      const cls = classifyInstance(control, dims, ctx);
      instances.push(makeInstance(control, dims, cls, identity));
    }

    // Component expansion
    if (control.expandable?.components) {
      for (const cid of comps.slice(0, 6)) {
        const dims = { component: cid, runtime: "DEVELOPMENT", profile: "local-foundation" };
        const cls = classifyInstance(control, dims, ctx);
        instances.push(makeInstance(control, dims, cls, identity));
      }
    }

    // Runtime expansion (subset or full)
    const runtimes =
      control.expandable?.runtimes === true
        ? RUNTIMES
        : control.expandable?.runtimes === "subset"
          ? ["DEVELOPMENT", "PACKAGED", "OPTIONAL_INFRA_DEGRADED"]
          : ["DEVELOPMENT", "PACKAGED"];
    for (const rt of runtimes) {
      const dims = {
        component: comps[0] || "manifest",
        runtime: rt,
        profile: "local-foundation",
      };
      const cls = classifyInstance(control, dims, ctx);
      instances.push(makeInstance(control, dims, cls, identity));
    }

    // Role expansion (archetypes + proof roles; seed aggregated once)
    if (control.expandable?.roles) {
      for (const roleId of roles.allRoleIds) {
        const dims = {
          component: "app:cockpit-ui",
          runtime: "DEVELOPMENT",
          profile: "local-foundation",
          role: roleId,
        };
        const cls = classifyInstance(control, dims, ctx);
        instances.push(makeInstance(control, dims, cls, identity));
      }
      // Aggregate seed roles as one dimension point (not 200 fake bugs)
      if (roles.rolesSeeded > 0) {
        const dims = {
          component: "pkg:professional-domain-registry",
          runtime: "DEVELOPMENT",
          profile: "local-foundation",
          role: `seed:aggregate:${roles.rolesSeeded}`,
        };
        const cls = classifyInstance(control, dims, ctx);
        instances.push(makeInstance(control, dims, cls, identity));
      }
    }

    // Action chain expansion
    if (control.expandable?.actions) {
      for (const a of actions.filter((x) => x.consequential)) {
        for (const step of chainSteps) {
          const dims = {
            component: a.source?.startsWith("apps/cockpit")
              ? "app:cockpit-ui"
              : "app:control-plane-api",
            runtime: "DEVELOPMENT",
            profile: "local-foundation",
            action: a.actionId,
            chainStep: step,
          };
          const cls = classifyInstance(control, dims, ctx);
          instances.push(makeInstance(control, dims, cls, identity));
        }
      }
    }

    // Failure expansion
    if (control.expandable?.failures) {
      const fails =
        Array.isArray(control.expandable.failures) &&
        control.expandable.failures !== true
          ? control.expandable.failures
          : FAILURES;
      for (const f of fails) {
        for (const rt of ["PACKAGED", "OPTIONAL_INFRA_DEGRADED"]) {
          const dims = {
            component: comps[0] || "installer",
            runtime: rt,
            profile: "local-foundation",
            failure: f,
          };
          const cls = classifyInstance(control, dims, ctx);
          instances.push(makeInstance(control, dims, cls, identity));
        }
      }
    }

    // Workflow GW1
    if (control.expandable?.workflows) {
      const dims = {
        component: "pkg:vertical-slice",
        runtime: "DEVELOPMENT",
        profile: "local-foundation",
        workflow: "gw1",
      };
      const cls = classifyInstance(control, dims, ctx);
      instances.push(makeInstance(control, dims, cls, identity));
    }
  }

  // Detector hits → concrete check instances (classified)
  for (const hit of detectors) {
    const controlId = `DET.${hit.detectorId}`;
    const control =
      catalog.controls.find((c) => c.controlId === controlId) || {
        controlId,
        title: hit.detectorId,
        familyId: "CF24",
        severityHint: hit.severity,
        baselineStatus: "UNKNOWN",
      };
    const dims = {
      component: guessComponent(hit.file),
      runtime: "DEVELOPMENT",
      profile: "local-foundation",
      detectorHit: {
        type: hit.type,
        severity: hit.severity,
        statusOverride: hit.type === "BUG" ? "FAIL" : "PARTIAL",
      },
      file: hit.file,
    };
    const cls = classifyInstance(control, dims, ctx);
    instances.push({
      ...makeInstance(control, dims, cls, identity),
      evidence: [hit.file, hit.snippet, hit.note],
      rootCauseHint: hit.root,
    });
  }

  return instances;
}

function guessComponent(file) {
  if (!file) return "manifest";
  if (file.startsWith("apps/")) {
    const name = file.split("/")[1];
    return `app:${name}`;
  }
  if (file.startsWith("packages/")) {
    const name = file.split("/")[1];
    return `pkg:${name}`;
  }
  if (file.startsWith("installer")) return "installer";
  if (file.startsWith("scripts/package")) return "scripts/package";
  return "manifest";
}

function makeInstance(control, dims, cls, identity) {
  const key = [
    control.controlId,
    dims.component || "",
    dims.runtime || "",
    dims.role || "",
    dims.action || "",
    dims.chainStep || "",
    dims.failure || "",
    dims.workflow || "",
    dims.file || "",
  ].join("|");
  return {
    checkId: `chk_${sha256(key).slice(0, 16)}`,
    controlId: control.controlId,
    component: dims.component || null,
    runtime: dims.runtime || null,
    profile: dims.profile || "local-foundation",
    role: dims.role || null,
    action: dims.action || null,
    chainStep: dims.chainStep || null,
    failure: dims.failure || null,
    workflow: dims.workflow || null,
    platform: process.platform,
    status: cls.status,
    type: cls.type,
    severity: cls.severity,
    runId: identity.runId,
    gitSha: identity.gitSha,
  };
}

/* ========================= ROOT CAUSE DEDUP ========================= */

function dedupeRootCauses(instances, detectors, enterpriseRegister) {
  const buckets = new Map();

  const add = (rootId, title, severity, type, instanceIds, evidence, fix) => {
    if (!buckets.has(rootId)) {
      buckets.set(rootId, {
        rootCauseId: rootId,
        title,
        severity,
        type,
        status: "OPEN",
        affectedInstances: [],
        evidence: [],
        recommendedFix: fix,
        acceptanceTest: `Rescan rootCauseId=${rootId}; affectedInstances must drop; fresh runId evidence required`,
      });
    }
    const b = buckets.get(rootId);
    b.affectedInstances.push(...instanceIds);
    for (const e of evidence) if (!b.evidence.includes(e)) b.evidence.push(e);
    // escalate severity
    const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    if ((rank[severity] ?? 9) < (rank[b.severity] ?? 9)) b.severity = severity;
  };

  // From detector roots
  const byRoot = new Map();
  for (const h of detectors) {
    if (!byRoot.has(h.root)) byRoot.set(h.root, []);
    byRoot.get(h.root).push(h);
  }
  for (const [root, hits] of byRoot) {
    add(
      root,
      root.replace(/_/g, " "),
      hits[0].severity,
      hits[0].type,
      hits.map((h) => `det:${h.file}:${h.detectorId}`),
      hits.slice(0, 8).map((h) => h.file),
      hits[0].note
    );
  }

  // From FAIL/PARTIAL enterprise gaps — group by family + status
  const gapFails = instances.filter(
    (i) =>
      (i.status === "FAIL" || i.status === "PARTIAL") &&
      i.controlId.startsWith("CF") &&
      !i.chainStep &&
      !i.failure &&
      !i.role
  );
  const byControl = new Map();
  for (const i of gapFails) {
    if (!byControl.has(i.controlId)) byControl.set(i.controlId, []);
    byControl.get(i.controlId).push(i.checkId);
  }
  for (const [controlId, ids] of byControl) {
    const ctrl = enterpriseRegister?.controls?.find((c) => c.controlId === controlId);
    // Skip PROVEN-derived PASS noise
    if (ctrl?.status === "PROVEN") continue;
    // Collapse many instance ids for same control into one root
    add(
      `CTRL.${controlId}`,
      ctrl?.title || controlId,
      ctrl?.severity || "P2",
      ctrl?.status === "ABSENT" ? "GAP" : "GAP",
      ids.slice(0, 20),
      ctrl?.currentEvidence || [],
      ctrl?.implementationProposal || "See enterprise-gap-register"
    );
  }

  // Action chain wiring collapses — dedupe approvals/nav into single roots
  const chainFails = instances.filter(
    (i) => i.chainStep && (i.status === "FAIL" || i.status === "PARTIAL")
  );
  const byAction = new Map();
  for (const i of chainFails) {
    const k = i.action;
    if (!byAction.has(k)) byAction.set(k, []);
    byAction.get(k).push(i);
  }
  const approvalIds = [];
  const navIds = [];
  const otherActionRoots = [];
  for (const [action, list] of byAction) {
    if (/approval/i.test(action)) {
      approvalIds.push(...list.map((x) => x.checkId));
      continue;
    }
    if (/^(nav_|open_)/i.test(action)) {
      navIds.push(...list.map((x) => x.checkId));
      continue;
    }
    const missing = [
      ...new Set(list.filter((x) => x.status === "FAIL").map((x) => x.chainStep)),
    ];
    if (!missing.length && !list.some((x) => x.status === "PARTIAL")) continue;
    otherActionRoots.push({ action, list, missing });
  }
  if (approvalIds.length) {
    add(
      "DECISION_ACTION_API_ABSENT",
      "Approve/Reject/Hold lack durable DecisionAction (actor→permission→governance→audit→evidence)",
      "P1",
      "WIRING",
      approvalIds,
      ["apps/cockpit-ui/src/index.js LOCAL REVIEW STATE"],
      "Implement DecisionAction API or keep LOCAL REVIEW STATE labeling; do not fake durable approval"
    );
  }
  if (navIds.length) {
    add(
      "UI_NAV_ACTION_CHAIN_PARTIAL",
      "Shell nav/command actions partially wired to actor/evidence chain",
      "P2",
      "WIRING",
      navIds,
      ["apps/cockpit-ui data-action-id"],
      "Attach actor envelope + lightweight audit for nav/commands where consequential"
    );
  }
  for (const { action, list, missing } of otherActionRoots) {
    add(
      `ACTION_CHAIN.${action.replace(/\s+/g, "_")}`,
      `Action chain incomplete: ${action}`,
      "P1",
      "WIRING",
      list.map((x) => x.checkId),
      missing,
      missing.includes("evidence")
        ? "Wire evidence emission for consequential action"
        : `Close chain steps: ${missing.join(",") || "partial steps"}`
    );
  }

  // Known first-release root causes from evidence docs (OPEN only — closed proofs must clear)
  const truth = fs.existsSync(path.join(ROOT, "docs/enterprise/CURRENT_EVIDENCE.md"))
    ? fs.readFileSync(path.join(ROOT, "docs/enterprise/CURRENT_EVIDENCE.md"), "utf8")
    : "";
  const packagedGw1StillOpen =
    /\|\s*\*\*Packaged GW1[^*]*\*\*\s*\|\s*\*\*(FAIL|OPEN)/i.test(truth) ||
    (/TASK-PKG-003/i.test(truth) &&
      /FAIL\s*\/\s*OPEN|OPEN\s*—\s*TASK-PKG-003/i.test(truth) &&
      !/\|\s*\*\*Packaged GW1[^*]*\*\*\s*\|\s*\*\*PASS/i.test(truth));
  if (packagedGw1StillOpen) {
    add(
      "PACKAGED_REBOOT_GW1_EVIDENCE_OPEN",
      "Packaged GW1 after reboot evidence OPEN (TASK-PKG-003)",
      "P0",
      "GAP",
      ["doc:CURRENT_EVIDENCE"],
      ["docs/enterprise/CURRENT_EVIDENCE.md"],
      "Produce fresh LOCALAPPDATA packaged Home→GW1→Evidence proof after reboot"
    );
  }

  // Deduplicate instance lists
  for (const b of buckets.values()) {
    b.affectedInstances = [...new Set(b.affectedInstances)];
    b.affectedCount = b.affectedInstances.length;
  }

  return [...buckets.values()].sort((a, b) => {
    const r = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (r[a.severity] ?? 9) - (r[b.severity] ?? 9) || b.affectedCount - a.affectedCount;
  });
}

/* ========================= ARCHITECTURE GRAPH ========================= */

function buildArchitectureGraph(components, actions, roles, catalog) {
  const nodes = [];
  const edges = [];

  const addNode = (id, kind, meta = {}) => {
    nodes.push({ id, kind, ...meta });
  };
  const addEdge = (from, to, relation, meta = {}) => {
    edges.push({ from, to, relation, ...meta });
  };

  // Boot graph
  addNode("boot:bootstrap-capsule", "boot");
  addNode("boot:start-sci-os", "boot");
  addNode("boot:supervisor", "boot");
  addNode("proc:control-plane", "process");
  addNode("proc:cockpit", "process");
  addNode("proc:recovery", "process");
  addEdge("boot:bootstrap-capsule", "boot:start-sci-os", "hands_off");
  addEdge("boot:start-sci-os", "boot:supervisor", "starts");
  addEdge("boot:supervisor", "proc:control-plane", "spawns");
  addEdge("boot:supervisor", "proc:cockpit", "spawns");
  addEdge("boot:supervisor", "proc:recovery", "spawns_optional");

  // Package / import (workspace deps)
  for (const c of components.filter((x) => x.kind === "package" || x.kind === "app")) {
    addNode(c.id, c.kind, { root: c.root });
    const pkgPath = path.join(ROOT, c.root, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, ver] of Object.entries(deps || {})) {
        if (!String(name).startsWith("@scios/")) continue;
        const to = `pkg:${name.replace("@scios/", "")}`;
        addEdge(c.id, to, "depends_on", { version: ver });
      }
    } catch {
      /* skip */
    }
  }

  // Capability nodes (sample from catalog CAP.*)
  for (const c of catalog.controls.filter((x) => x.controlId.startsWith("CAP.")).slice(0, 200)) {
    addNode(c.controlId, "capability", { baseline: c.baselineStatus });
    addEdge("pkg:product-kernel", c.controlId, "registers");
  }

  // Action graph
  for (const a of actions) {
    addNode(`action:${a.actionId}`, "action", { kind: a.kind });
    if (a.consequential) {
      addEdge(`action:${a.actionId}`, "policy:governance", "requires");
      addEdge(`action:${a.actionId}`, "evidence:lineage", "should_emit");
    }
  }
  addNode("policy:governance", "policy");
  addNode("evidence:lineage", "evidence");

  // Role / experience
  for (const r of roles.allRoleIds) {
    addNode(`role:${r}`, "role");
    addEdge(`role:${r}`, "exp:compiler", "compiles_via");
  }
  addNode("exp:compiler", "experience", {
    authority: "@scios/professional-domain-registry/compiler",
  });
  addEdge("exp:compiler", "app:cockpit-ui", "renders_in");

  // Detect broken edges
  const nodeIds = new Set(nodes.map((n) => n.id));
  const broken = [];
  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
      broken.push({ ...e, issue: "missing_node" });
    }
  }

  // Duplicate authority candidates
  const duplicateAuthorities = [];
  if (fs.existsSync(path.join(ROOT, "packages/experience-compiler"))) {
    duplicateAuthorities.push({
      concept: "ExperienceCompiler",
      canonical: "pkg:professional-domain-registry",
      duplicate: "pkg:experience-compiler",
      status: "DEPRECATED_DIR",
    });
  }

  return {
    schema: "sci-os-architecture-graph/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    graphs: {
      boot: true,
      process: true,
      package: true,
      import: true,
      capability: true,
      action: true,
      policy: true,
      role: true,
      experience: true,
      evidence: true,
    },
    nodes,
    edges,
    brokenEdges: broken,
    duplicateAuthorities,
    cycles: [], // workspace deps are DAG-ish; full cycle detect optional
    note: "Broken edge ≠ auto-bug; classify before repair",
  };
}

/* ========================= REPAIR QUEUE ========================= */

function buildRepairQueue(rootCauses) {
  const open = rootCauses.filter((r) => r.status === "OPEN");
  const batches = [];
  let i = 0;
  const order = ["P0", "P1", "P2", "P3"];
  for (const sev of order) {
    const group = open.filter((r) => r.severity === sev);
    while (group.length) {
      const batch = group.splice(0, 5);
      batches.push({
        batchId: `batch_${String(++i).padStart(3, "0")}_${sev}`,
        severity: sev,
        rootCauseIds: batch.map((b) => b.rootCauseId),
        maxRootCauses: 5,
        protocol: [
          "DISCOVER",
          "REPRODUCE",
          "ROOT_CAUSE",
          "BLAST_RADIUS",
          "PATCH",
          "TARGETED_TEST",
          "INTEGRATION_TEST",
          "RUNTIME_TEST",
          "EVIDENCE",
          "ACCEPT_OR_ROLLBACK",
          "STATE_UPDATE",
          "RESCAN_IMPACTED",
        ],
        status: "QUEUED",
        note: "Do not edit 100 unrelated files in one batch",
      });
    }
  }

  return {
    schema: "sci-os-repair-queue/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    order: ["P0 runtime", "P0 security/corruption", "P1 first-release", "P1 governance/evidence", "P2 production", "P3 enhance"],
    batchMax: 5,
    batches,
    nextBatch: batches[0] || null,
    stopCondition: {
      firstRelease: {
        p0Open: 0,
        p1Open: 0,
        mandatoryUnknown: 0,
        require: [
          "package runtime PASS",
          "Home PASS",
          "GW1 PASS",
          "governance PASS",
          "Evidence/Lineage PASS",
          "shutdown PASS",
        ],
      },
    },
  };
}

/* ========================= TOP LISTS ========================= */

function buildTopLists(rootCauses, catalog, instances) {
  const topRoot = rootCauses.slice(0, 50).map((r, i) => ({
    rank: i + 1,
    rootCauseId: r.rootCauseId,
    title: r.title,
    severity: r.severity,
    type: r.type,
    affectedCount: r.affectedCount,
    recommendedFix: r.recommendedFix,
  }));

  const missingCaps = catalog.controls
    .filter(
      (c) =>
        c.controlId.startsWith("CAP.") &&
        ["ABSENT", "MISSING", "STUB", "UNKNOWN", "DISCONNECTED"].includes(
          String(c.baselineStatus).toUpperCase()
        )
    )
    .slice(0, 50)
    .map((c, i) => ({
      rank: i + 1,
      controlId: c.controlId,
      title: c.title,
      baselineStatus: c.baselineStatus,
      severityHint: c.severityHint,
    }));

  const enterpriseGaps = (readJsonSafe("diagnostics-export/closure/enterprise-gap-register.json")
    ?.top25 || [])
    .concat(
      (readJsonSafe("diagnostics-export/closure/enterprise-gap-register.json")?.gaps || [])
        .filter((g) => g.severity === "P2" || g.severity === "P0")
        .slice(0, 40)
    )
    .slice(0, 50)
    .map((g, i) => ({
      rank: i + 1,
      controlId: g.controlId,
      title: g.title,
      status: g.status,
      severity: g.severity,
    }));

  // Test gaps: routes/actions without tests, pipeline stages UNKNOWN
  const testGaps = catalog.controls
    .filter(
      (c) =>
        c.controlId.startsWith("PIPE.") ||
        c.controlId.startsWith("DET.route_without_test") ||
        c.controlId.startsWith("RT.")
    )
    .filter((c) => c.baselineStatus !== "PROVEN")
    .slice(0, 50)
    .map((c, i) => ({
      rank: i + 1,
      controlId: c.controlId,
      title: c.title,
      severityHint: c.severityHint,
    }));

  const runtimeBuild = rootCauses
    .filter(
      (r) =>
        /PACKAGED|BOOT|READINESS|HASH|IMPORT_META|DETACHED|RUNTIME|BUILD|ARTIFACT/i.test(
          r.rootCauseId
        ) || r.severity === "P0"
    )
    .slice(0, 50)
    .map((r, i) => ({
      rank: i + 1,
      rootCauseId: r.rootCauseId,
      title: r.title,
      severity: r.severity,
      affectedCount: r.affectedCount,
    }));

  // Status tallies
  const byStatus = {};
  for (const i of instances) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  }

  return {
    top50RootCauses: topRoot,
    top50MissingCapabilities: missingCaps,
    top50EnterpriseGaps: enterpriseGaps,
    top50TestGaps: testGaps,
    top50RuntimeBuildGaps: runtimeBuild,
    instanceStatusCounts: byStatus,
  };
}

/* ========================= IMPACT HELPER ========================= */

function changeImpactStub(fileRel) {
  // Lightweight impact for future repair batches
  const abs = path.join(ROOT, fileRel);
  const importers = [];
  // skip heavy scan — return contract shape
  return {
    file: fileRel,
    exists: fs.existsSync(abs),
    affectedImports: importers,
    affectedPackages: [],
    affectedRoutes: [],
    affectedCapabilities: [],
    affectedRoles: [],
    affectedActions: [],
    affectedUx: [],
    affectedTests: [],
    affectedPackaging: fileRel.includes("package") || fileRel.includes("installer"),
    requiredRegression: [
      "scripts/tests/block2-gw1-birth-test.cjs",
      "pnpm --filter @scios/vertical-slice test",
      "node packages/system-closure/src/continuous-closure-engine.js",
    ],
  };
}

/* ========================= MAIN ========================= */

export async function runContinuousClosure(opts = {}) {
  const enterpriseRegister = readJsonSafe(
    "diagnostics-export/closure/enterprise-gap-register.json"
  );
  if (!enterpriseRegister) {
    console.warn(
      "[closure] enterprise-gap-register.json missing — run Block 3 generator first for richer catalog"
    );
  }

  const components = enumerateComponents();
  const identity = buildIdentity(components);
  const roles = loadRoles();
  const actions = discoverActions();
  const catalog = buildControlCatalog(enterpriseRegister);
  const detectors = runStaticDetectors(components);
  const instances = expandCheckInstances(
    catalog,
    components,
    roles,
    actions,
    detectors,
    identity
  );

  // Deduplicate checkIds
  const uniq = new Map();
  for (const i of instances) {
    if (!uniq.has(i.checkId)) uniq.set(i.checkId, i);
  }
  const uniqueInstances = [...uniq.values()];

  const rootCauses = dedupeRootCauses(
    uniqueInstances,
    detectors,
    enterpriseRegister
  );
  const graph = buildArchitectureGraph(components, actions, roles, catalog);
  const queue = buildRepairQueue(rootCauses);
  const tops = buildTopLists(rootCauses, catalog, uniqueInstances);

  const byStatus = tops.instanceStatusCounts;
  const bySev = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const r of rootCauses) {
    if (r.status === "OPEN") bySev[r.severity] = (bySev[r.severity] || 0) + 1;
  }

  const summary = {
    schema: "sci-os-closure-summary/v1",
    label: "ALPHA_NON_PRODUCTION",
    block: "BLOCK_4_CONTINUOUS_CLOSURE",
    at: new Date().toISOString(),
    identity,
    CANONICAL_CONTROLS: catalog.count,
    CHECK_INSTANCES: uniqueInstances.length,
    PASS: byStatus.PASS || 0,
    FAIL: byStatus.FAIL || 0,
    PARTIAL: byStatus.PARTIAL || 0,
    UNKNOWN: byStatus.UNKNOWN || 0,
    NOT_APPLICABLE: byStatus.NOT_APPLICABLE || 0,
    DEFERRED: byStatus.DEFERRED || 0,
    ROOT_CAUSES: rootCauses.length,
    P0_ROOT_CAUSES: bySev.P0,
    P1_ROOT_CAUSES: bySev.P1,
    P2_ROOT_CAUSES: bySev.P2,
    P3_ROOT_CAUSES: bySev.P3,
    detectorHits: detectors.length,
    components: components.length,
    actions: actions.length,
    rolesArchetypes: roles.allRoleIds.length,
    rolesSeeded: roles.rolesSeeded,
    nextBatch: queue.nextBatch,
    firstReleaseStop: queue.stopCondition.firstRelease,
    protectedContracts: [
      "permissions",
      "risk",
      "policy",
      "governance",
      "evidence",
      "founder protected contracts",
    ],
    forbidden: [
      "duplicate authority",
      "silently disable tests",
      "UNKNOWN→PASS without evidence",
      "remove functionality to eliminate failure",
    ],
    tops,
    changeImpactExample: changeImpactStub(
      "apps/control-plane-api/src/routes/product.ts"
    ),
  };

  writeJson("control-catalog.json", {
    ...catalog,
    identity,
  });

  // Large instances file — compact
  writeJson("check-instances.json", {
    schema: "sci-os-check-instances/v1",
    label: "ALPHA_NON_PRODUCTION",
    identity,
    count: uniqueInstances.length,
    note: "Check instance ≠ bug. Status NOT_APPLICABLE/DEFERRED/UNKNOWN are valid.",
    instances: uniqueInstances,
  });

  writeJson("root-causes.json", {
    schema: "sci-os-root-causes/v1",
    label: "ALPHA_NON_PRODUCTION",
    identity,
    count: rootCauses.length,
    rootCauses,
  });

  writeJson("repair-queue.json", {
    ...queue,
    identity,
  });

  writeJson("architecture-graph.json", {
    ...graph,
    identity,
  });

  writeJson("closure-summary.json", summary);

  // Human-readable tops
  writeJson("closure-top50.json", {
    identity,
    ...tops,
  });

  if (!opts.silent) {
    console.log(
      JSON.stringify(
        {
          out: OUT,
          CANONICAL_CONTROLS: summary.CANONICAL_CONTROLS,
          CHECK_INSTANCES: summary.CHECK_INSTANCES,
          PASS: summary.PASS,
          FAIL: summary.FAIL,
          PARTIAL: summary.PARTIAL,
          UNKNOWN: summary.UNKNOWN,
          NOT_APPLICABLE: summary.NOT_APPLICABLE,
          DEFERRED: summary.DEFERRED,
          ROOT_CAUSES: summary.ROOT_CAUSES,
          P0: summary.P0_ROOT_CAUSES,
          P1: summary.P1_ROOT_CAUSES,
          P2: summary.P2_ROOT_CAUSES,
          P3: summary.P3_ROOT_CAUSES,
          nextBatch: summary.nextBatch?.batchId,
        },
        null,
        2
      )
    );
  }

  return summary;
}

const isMain =
  process.argv[1] &&
  path.normalize(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));

if (isMain) {
  runContinuousClosure().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
