#!/usr/bin/env node
"use strict";

/**
 * scripts/generate-golden-boot-manifest.js
 * Template: installer/golden-boot.manifest.json
 * Schema:   installer/schemas/golden-boot-manifest.schema.json
 * Output:   build/golden-boot.manifest.json
 *           diagnostics-export/golden-boot.manifest.json
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");

const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "installer", "golden-boot.manifest.json");
const SCHEMA_REL = "installer/schemas/golden-boot-manifest.schema.json";

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function sha256File(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")}`;
}

if (!fs.existsSync(TEMPLATE)) {
  console.error(
    JSON.stringify({
      step: "generate-golden-boot-manifest",
      ok: false,
      error: "installer/golden-boot.manifest.json missing",
    })
  );
  process.exit(1);
}

const template = readJson(TEMPLATE);
const buildManifest = (() => {
  const p = path.join(ROOT, "build", "manifest.json");
  if (!fs.existsSync(p)) return null;
  try {
    return readJson(p);
  } catch {
    return null;
  }
})();

const buildSHA =
  process.env.BUILD_SHA ||
  buildManifest?.buildSHA ||
  run("git rev-parse HEAD");

const sciManifestPath = path.join(ROOT, "sci-os.manifest.json");
const sciManifest = fs.existsSync(sciManifestPath)
  ? readJson(sciManifestPath)
  : null;

const fileHashes = { ...(template.fileHashes || {}) };
for (const svc of template.services || []) {
  const parts = String(svc.entry || "").split(/\s+/);
  const script = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  if (script && /\.(js|cjs|mjs|ts)$/.test(script)) {
    const h = sha256File(script);
    if (h) fileHashes[script.replace(/\\/g, "/")] = h;
  }
}
for (const rel of [
  "installer/golden-boot.manifest.json",
  "installer/scripts/bootstrap-capsule.cjs",
  "installer/scripts/start-sci-os.cjs",
  "sci-os.manifest.json",
  SCHEMA_REL,
  "package.json",
  "pnpm-lock.yaml",
]) {
  const h = sha256File(rel);
  if (h) fileHashes[rel] = h;
}

const ports = {
  ...(template.ports || {}),
  ...(sciManifest?.ports || {}),
};

const manifest = {
  ...template,
  $schema: `./${SCHEMA_REL}`,
  buildSHA,
  ports,
  fileHashes,
  generatedAt: new Date().toISOString(),
  label: "ALPHA_NON_PRODUCTION",
  note:
    "Aligned with sci-os.manifest.json. Capsule delegates to installer/scripts/bootstrap-capsule.cjs — not a second orchestrator.",
};

const schema = readJson(path.join(ROOT, SCHEMA_REL));
const missing = (schema.required || []).filter((k) => !(k in manifest));
const serviceOk = (manifest.services || []).every(
  (s) => s.name && s.entry && Array.isArray(s.args) && s.healthEndpoint
);

const outs = [
  path.join(ROOT, "build", "golden-boot.manifest.json"),
  path.join(ROOT, "diagnostics-export", "golden-boot.manifest.json"),
  path.join(ROOT, "bootstrap", "boot-manifest.json"),
];
for (const out of outs) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const body =
    out.endsWith(`${path.sep}boot-manifest.json`) ||
    out.endsWith("/boot-manifest.json")
      ? {
          ...manifest,
          $schema: "../installer/schemas/golden-boot-manifest.schema.json",
        }
      : manifest;
  fs.writeFileSync(out, JSON.stringify(body, null, 2));
}

console.log(
  JSON.stringify(
    {
      step: "generate-golden-boot-manifest",
      ok: missing.length === 0 && serviceOk,
      template: "installer/golden-boot.manifest.json",
      schema: SCHEMA_REL,
      buildSHA,
      out: outs.map((p) => path.relative(ROOT, p).replace(/\\/g, "/")),
      missingRequired: missing,
      services: (manifest.services || []).map((s) => s.name),
      ports: manifest.ports,
    },
    null,
    2
  )
);
process.exit(missing.length === 0 && serviceOk ? 0 : 1);
