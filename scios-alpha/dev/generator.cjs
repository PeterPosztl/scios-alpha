#!/usr/bin/env node
"use strict";

/**
 * dev/generator.cjs — SCI OS ×10 auto-fill generator (propose-only by default)
 *
 * Mirrors dev/generator.py capabilities for Windows/Node-first workflows.
 *
 *   node dev/generator.cjs --manifest build/manifest.json --templates dev/templates
 *   node dev/generator.cjs --apply --scan-todos
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = process.cwd();
const LABEL = "ALPHA_NON_PRODUCTION";
const TEMPLATE_PLACEHOLDER = "<AUTO_GENERATED>";
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".next",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "diagnostics-export",
  "sandbox",
]);
const CREATE_FILE_RE = /create file[:\s]+([^\s"'`]+)/gi;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function render(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

function isArtifactPath(rel) {
  const norm = rel.replace(/\\/g, "/");
  return norm.includes("/dist/") || norm.startsWith("dist/");
}

function collectManifestFiles(manifest) {
  const files = [];
  for (const entry of manifest.files || []) {
    if (typeof entry === "string") files.push(entry.replace(/\\/g, "/"));
    else if (entry && entry.path) files.push(String(entry.path).replace(/\\/g, "/"));
  }
  return files;
}

function collectMissingArtifacts(manifest) {
  const missing = [];
  for (const entry of manifest.artifacts || []) {
    const p =
      typeof entry === "string"
        ? entry
        : entry && entry.path
          ? String(entry.path)
          : null;
    if (!p) continue;
    const rel = p.replace(/\\/g, "/");
    if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
  }
  return missing;
}

function resolveTemplate(templatesDir, destRel) {
  const ext = path.extname(destRel).replace(/^\./, "");
  const candidates = [];
  if (ext) candidates.push(`${ext}.tpl`);
  candidates.push("stub-module.cjs.tpl");
  for (const name of candidates) {
    const abs = path.join(templatesDir, name);
    if (fs.existsSync(abs)) {
      const tpl = fs.readFileSync(abs, "utf8");
      return {
        body: render(tpl, {
          PATH: destRel.replace(/\\/g, "/"),
          TEMPLATE: name,
          ID: path.basename(destRel).replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_"),
        }),
        template: name,
      };
    }
  }
  return {
    body: `${TEMPLATE_PLACEHOLDER}\n# Auto-generated stub for ${path.basename(destRel)}\n# ${LABEL}\n`,
    template: "inline-fallback",
  };
}

function walkTodos(maxFiles = 5000) {
  const todos = [];
  let scanned = 0;
  const stack = [ROOT];
  while (stack.length && scanned < maxFiles) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name) || ent.name.startsWith(".")) continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!ent.isFile()) continue;
      scanned += 1;
      if (scanned > maxFiles) break;
      let text;
      try {
        text = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      if (text.includes("TODO") || text.includes("FIXME")) {
        todos.push(path.relative(ROOT, abs).replace(/\\/g, "/"));
      }
    }
  }
  return todos;
}

function proposeOrWrite(rel, templatesDir, outDir, apply, results) {
  rel = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  if (isArtifactPath(rel)) {
    results.push({ path: rel, action: "skipped_artifact_path" });
    return false;
  }
  const destAbs = path.join(ROOT, rel);
  if (fs.existsSync(destAbs)) {
    results.push({ path: rel, action: "exists_skip" });
    return false;
  }
  const { body, template } = resolveTemplate(templatesDir, rel);
  const sha = crypto.createHash("sha256").update(body).digest("hex");
  const proposalRel = path.join("proposals", rel.replace(/[\\/]/g, "__"));
  const proposalAbs = path.join(outDir, proposalRel);
  ensureDir(path.dirname(proposalAbs));
  fs.writeFileSync(proposalAbs, body);
  if (apply) {
    ensureDir(path.dirname(destAbs));
    fs.writeFileSync(destAbs, body);
    results.push({
      path: rel,
      action: "applied",
      template,
      sha256: sha,
      proposal: proposalRel.replace(/\\/g, "/"),
    });
  } else {
    results.push({
      path: rel,
      action: "proposed",
      template,
      sha256: sha,
      proposal: proposalRel.replace(/\\/g, "/"),
    });
  }
  return true;
}

function main() {
  const manifestRel = arg("--manifest", "build/manifest.json");
  const templatesRel = arg("--templates", "dev/templates");
  const planRel = arg("--plan", "dev/fill-plan.json");
  const apply = hasFlag("--apply");
  const scanTodos = hasFlag("--scan-todos");

  const manifestPath = path.join(ROOT, manifestRel);
  const templatesDir = path.join(ROOT, templatesRel);
  const planPath = path.join(ROOT, planRel);
  const outDir = path.join(ROOT, "diagnostics-export", "auto-fill");
  ensureDir(outDir);

  if (!fs.existsSync(manifestPath)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "MANIFEST_MISSING",
        manifest: manifestRel,
      })
    );
    process.exit(1);
  }

  const manifest = readJson(manifestPath);
  const plan = fs.existsSync(planPath) ? readJson(planPath) : { targets: [] };
  const results = [];
  const generated = [];

  for (const t of plan.targets || []) {
    if (t.enabled === false) {
      results.push({ path: t.path, action: "skipped_disabled" });
      continue;
    }
    if (!t.path) continue;
    if (proposeOrWrite(t.path, templatesDir, outDir, apply, results)) {
      generated.push(t.path.replace(/\\/g, "/"));
    }
  }

  const missingFiles = [];
  for (const entry of collectManifestFiles(manifest)) {
    if (!fs.existsSync(path.join(ROOT, entry))) {
      missingFiles.push(entry);
      if (proposeOrWrite(entry, templatesDir, outDir, apply, results)) {
        generated.push(entry);
      }
    }
  }

  const missingArtifacts = collectMissingArtifacts(manifest);
  for (const a of missingArtifacts) {
    results.push({ path: a, action: "missing_artifact_report_only" });
  }

  let todos = [];
  if (scanTodos) {
    todos = walkTodos();
    for (const tfile of todos) {
      let text;
      try {
        text = fs.readFileSync(path.join(ROOT, tfile), "utf8");
      } catch {
        continue;
      }
      CREATE_FILE_RE.lastIndex = 0;
      let m;
      while ((m = CREATE_FILE_RE.exec(text))) {
        const target = m[1].replace(/[.,;]+$/, "");
        if (target && !fs.existsSync(path.join(ROOT, target))) {
          if (proposeOrWrite(target, templatesDir, outDir, apply, results)) {
            generated.push(target);
          }
        }
      }
    }
  }

  const proposed = results.filter((r) => r.action === "proposed").length;
  const written = results.filter((r) => r.action === "applied").length;

  const report = {
    at: new Date().toISOString(),
    schema: "sci-os-auto-fill-generator/v1",
    engine: "node",
    label: LABEL,
    mode: apply ? "apply" : "propose-only",
    manifest: {
      path: manifestRel.replace(/\\/g, "/"),
      buildSHA: manifest.buildSHA || null,
      packageName: manifest.packageName || null,
    },
    plan: planRel.replace(/\\/g, "/"),
    templates: templatesRel.replace(/\\/g, "/"),
    scanTodos,
    counts: {
      missingManifestFiles: missingFiles.length,
      missingArtifactsReportOnly: missingArtifacts.length,
      todoFiles: todos.length,
      generated: generated.length,
      proposed,
      written,
    },
    missingManifestFiles: missingFiles,
    missingArtifactsReportOnly: missingArtifacts,
    todoFilesSample: todos.slice(0, 50),
    generated,
    results,
    note:
      "Propose-only by default. dist/ artifacts are never stubbed. Use --scan-todos deliberately.",
  };

  fs.writeFileSync(
    path.join(outDir, "generator-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main();
