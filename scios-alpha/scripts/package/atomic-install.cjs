#!/usr/bin/env node
"use strict";

/**
 * Atomic installer — stage → verify → swap → rollback on failure.
 * Installs dist/SCI-OS-X10 (or --source) into:
 *   %LOCALAPPDATA%\SCI OS X10\app
 * Data root remains:
 *   %LOCALAPPDATA%\SCI OS X10\data
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function validatePayload(payloadRoot) {
  const manPath = path.join(payloadRoot, "manifests", "golden-boot.packaged.json");
  if (!fs.existsSync(manPath)) {
    return { ok: false, error: "PACKAGED_MANIFEST_MISSING" };
  }
  const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  const hashes = man.requiredFileHashes || {};
  for (const [rel, expected] of Object.entries(hashes)) {
    const abs = path.join(payloadRoot, rel);
    if (!fs.existsSync(abs)) return { ok: false, error: "REQUIRED_FILE_MISSING", file: rel };
    const actual = sha256(abs);
    if (actual !== expected) {
      return { ok: false, error: "REQUIRED_FILE_HASH_MISMATCH", file: rel, expected, actual };
    }
  }
  const node = path.join(payloadRoot, "runtime", "node", "node.exe");
  const ver = spawnSync(node, ["--version"], { encoding: "utf8", shell: false, windowsHide: true });
  if (String(ver.stdout || "").trim() !== "v20.18.1") {
    return {
      ok: false,
      error: "BUNDLED_NODE_VERSION_MISMATCH",
      actual: String(ver.stdout || "").trim(),
    };
  }
  return { ok: true, buildId: man.buildId };
}

function main() {
  const args = process.argv.slice(2);
  let source = path.join(ROOT, "dist", "SCI-OS-X10");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) source = path.resolve(args[++i]);
  }

  const localApp = process.env.LOCALAPPDATA || process.env.HOME || ROOT;
  const productRoot = path.join(localApp, "SCI OS X10");
  const installDir = path.join(productRoot, "app");
  const dataDir = path.join(productRoot, "data");
  const staging = path.join(productRoot, "app.staging");
  const backup = path.join(productRoot, `app.backup.${Date.now()}`);

  const report = {
    schema: "sci-os-atomic-install/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    source,
    installDir,
    dataDir,
    steps: [],
  };

  function step(name, detail) {
    report.steps.push({ name, at: new Date().toISOString(), ...detail });
  }

  try {
    if (!fs.existsSync(source)) {
      throw Object.assign(new Error("SOURCE_MISSING"), { code: "SOURCE_MISSING" });
    }
    fs.mkdirSync(dataDir, { recursive: true });
    rmrf(staging);
    step("stage_copy", { staging });
    copyDir(source, staging);

    const v = validatePayload(staging);
    step("stage_verify", v);
    if (!v.ok) throw Object.assign(new Error(v.error), v);

    if (fs.existsSync(installDir)) {
      step("backup_current", { backup });
      fs.renameSync(installDir, backup);
    }

    step("promote_staging", { installDir });
    fs.renameSync(staging, installDir);

    const live = validatePayload(installDir);
    step("live_verify", live);
    if (!live.ok) {
      // rollback
      rmrf(installDir);
      if (fs.existsSync(backup)) fs.renameSync(backup, installDir);
      throw Object.assign(new Error(live.error || "LIVE_VERIFY_FAILED"), live);
    }

    if (fs.existsSync(backup)) {
      const last = path.join(productRoot, "app.backup.last");
      let aliasOk = false;
      for (let attempt = 0; attempt < 3 && !aliasOk; attempt++) {
        try {
          if (fs.existsSync(last)) rmrf(last);
          fs.renameSync(backup, last);
          aliasOk = true;
          step("retain_backup_last", { last, attempt });
        } catch (e) {
          const code = e.code || "";
          if ((code === "EPERM" || code === "EBUSY") && attempt < 2) {
            spawnSync("ping", ["-n", "2", "127.0.0.1"], { shell: true, windowsHide: true });
          } else {
            step("retain_backup_degraded", {
              error: String(e.message || e),
              code,
              backup,
              note: "Timestamped backup preserved; alias refresh deferred. Likely cause: delayed file handle release on node.exe (antivirus/OS).",
            });
          }
        }
      }
    }

    // Primary shortcut target (EXE if present, else CMD) — must point at LOCALAPPDATA install
    const exe = path.join(installDir, "SCI-OS-X10.exe");
    const cmdAscii = path.join(installDir, "SCI-OS-X10.cmd");
    const cmdPretty = path.join(installDir, "SCI OS X10.cmd");
    const target = fs.existsSync(exe)
      ? exe
      : fs.existsSync(cmdPretty)
        ? cmdPretty
        : cmdAscii;
    report.primaryEntry = target;
    report.buildId = live.buildId;

    function createShortcut(linkPath, targetPath, cwd) {
      const ps = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${linkPath.replace(/'/g, "''")}')
$Shortcut.TargetPath = '${targetPath.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = '${cwd.replace(/'/g, "''")}'
$Shortcut.Description = 'SCI OS ×10'
$Shortcut.Save()
`;
      return spawnSync(
        "powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
        { encoding: "utf8", windowsHide: true }
      );
    }

    const startMenu = path.join(
      process.env.APPDATA || "",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs"
    );
    const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
    const shortcuts = {};
    if (fs.existsSync(startMenu)) {
      const link = path.join(startMenu, "SCI OS X10.lnk");
      const r = createShortcut(link, target, installDir);
      shortcuts.startMenu = { link, target, cwd: installDir, ok: r.status === 0 };
    }
    if (fs.existsSync(desktop)) {
      const link = path.join(desktop, "SCI OS X10.lnk");
      const r = createShortcut(link, target, installDir);
      shortcuts.desktop = { link, target, cwd: installDir, ok: r.status === 0 };
    }
    step("shortcuts_localappdata", shortcuts);
    report.shortcuts = shortcuts;
    report.ok = true;
  } catch (e) {
    report.ok = false;
    report.error = e.code || e.error || e.message;
    report.detail = e;
    // cleanup staging leftovers
    try {
      if (fs.existsSync(staging)) rmrf(staging);
    } catch {
      /* ignore */
    }
  }

  const outDir = path.join(ROOT, "diagnostics-export", "cursor-repair");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "atomic-install-proof.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
}

main();
