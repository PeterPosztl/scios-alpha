#!/usr/bin/env node
"use strict";
/**
 * Generate .d.ts for the plain-ESM JS workspace packages that TypeScript apps
 * import. Without these, @scios/product-kernel and the professional domain
 * registry resolve to implicit `any` inside apps/control-plane-api, so the
 * Product Kernel authority boundary gets no type checking at all.
 *
 * Declarations are derived from the implementation (tsc --allowJs), never
 * hand-written, so they cannot describe a surface the JS does not have.
 *
 *   node scripts/dev/generate-package-types.cjs          # write types/
 *   node scripts/dev/generate-package-types.cjs --check  # fail on drift
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

const TARGETS = [
  { pkg: "packages/product-kernel", entries: ["src/index.js", "src/discipline/index.js"] },
  {
    pkg: "packages/professional-domain-registry",
    entries: [
      "src/index.js",
      "src/compiler-pipeline.js",
      "src/profession-blueprint.js",
      "src/experience-compiler.js",
      "src/compile-registry.js",
    ],
  },
];

const TSC_FLAGS = [
  "--allowJs",
  "--declaration",
  "--emitDeclarationOnly",
  "--module",
  "nodenext",
  "--moduleResolution",
  "nodenext",
  "--target",
  "es2022",
  "--skipLibCheck",
];

/** tsc is resolved and run through node directly — npx does not spawn reliably on Windows. */
const TSC_BIN = require.resolve("typescript/bin/tsc", { paths: [ROOT] });

function emit(pkgDir, entries, outDir) {
  const res = spawnSync(
    process.execPath,
    [TSC_BIN, ...entries, ...TSC_FLAGS, "--outDir", outDir],
    { cwd: pkgDir, encoding: "utf8", windowsHide: true, timeout: 300000 }
  );
  return {
    code: res.status,
    out: (res.stdout || "") + (res.stderr || "") + (res.error ? String(res.error.message) : ""),
  };
}

function snapshot(dir) {
  const files = {};
  if (!fs.existsSync(dir)) return files;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (ent.name.endsWith(".d.ts")) {
        // Newlines are normalized so git's CRLF handling cannot look like drift.
        files[path.relative(dir, abs).replace(/\\/g, "/")] = fs
          .readFileSync(abs, "utf8")
          .replace(/\r\n/g, "\n");
      }
    }
  };
  walk(dir);
  return files;
}

function main() {
  const check = process.argv.includes("--check");
  const report = { schema: "sci-os-package-types/v1", at: new Date().toISOString(), mode: check ? "check" : "write", packages: [], status: "PASS" };

  for (const t of TARGETS) {
    const pkgDir = path.join(ROOT, t.pkg);
    const committed = path.join(pkgDir, "types");
    const entry = { pkg: t.pkg };

    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "scios-types-"));
    const gen = emit(pkgDir, t.entries, stage);
    entry.tscExit = gen.code;
    if (gen.code !== 0) {
      entry.status = "FAIL";
      entry.error = gen.out.split(/\r?\n/).filter(Boolean).slice(0, 8);
      report.status = "FAIL";
      report.packages.push(entry);
      continue;
    }

    const fresh = snapshot(stage);
    entry.declarationCount = Object.keys(fresh).length;

    if (check) {
      const current = snapshot(committed);
      const drifted = Object.keys(fresh).filter((f) => current[f] !== fresh[f]);
      const removed = Object.keys(current).filter((f) => !(f in fresh));
      entry.drifted = drifted;
      entry.stale = removed;
      entry.status = drifted.length === 0 && removed.length === 0 ? "PASS" : "FAIL";
      if (entry.status === "FAIL") report.status = "FAIL";
    } else {
      fs.rmSync(committed, { recursive: true, force: true });
      for (const [rel, body] of Object.entries(fresh)) {
        const dest = path.join(committed, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, body);
      }
      entry.status = "PASS";
    }
    fs.rmSync(stage, { recursive: true, force: true });
    report.packages.push(entry);
  }

  const outDir = path.join(ROOT, "diagnostics-export", "final-completion");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "package-types.json"),
    JSON.stringify(report, null, 2) + "\n"
  );

  console.log(JSON.stringify({ ok: report.status === "PASS", mode: report.mode, packages: report.packages.map((p) => ({ pkg: p.pkg, status: p.status, declarationCount: p.declarationCount, drifted: p.drifted?.length ?? 0 })) }));
  if (report.status !== "PASS") {
    if (check) console.error("Package declarations are stale — run: node scripts/dev/generate-package-types.cjs");
    process.exit(1);
  }
}

main();
