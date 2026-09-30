#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 Setup — installs payload to LocalAppData, creates Start Menu + Desktop shortcuts.
 * Packaged as Setup.exe via pkg. Does NOT install system Node/pnpm.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function installRootDefault() {
  const base =
    process.env.LOCALAPPDATA ||
    process.env.USERPROFILE ||
    path.join("C:\\", "SCI-OS-X10-Install");
  return path.join(base, "SCI OS X10");
}

function resolvePayload() {
  const here = process.pkg
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, "../../dist/release");
  const candidates = [
    path.join(here, "payload"),
    path.join(here, "SCI-OS-X10"),
    path.join(path.dirname(here), "SCI-OS-X10"),
    path.resolve(__dirname, "../../dist/SCI-OS-X10"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "runtime", "node", "node.exe"))) return c;
    if (fs.existsSync(path.join(c, "backend", "server.cjs"))) return c;
  }
  return null;
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

function createShortcut(opts) {
  const ps = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${opts.linkPath.replace(/'/g, "''")}')
$Shortcut.TargetPath = '${opts.target.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = '${opts.cwd.replace(/'/g, "''")}'
$Shortcut.Description = 'SCI OS ×10'
$Shortcut.Save()
`;
  return spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8" }
  );
}

function main() {
  const payload = resolvePayload();
  if (!payload) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "PAYLOAD_MISSING",
        note: "Place Setup.exe next to payload/ folder containing runtime/node/node.exe",
      })
    );
    process.exit(1);
  }

  const installDir =
    process.argv.find((a) => a.startsWith("--dir="))?.slice(6) ||
    installRootDefault();

  console.log(
    JSON.stringify({
      step: "install",
      from: payload,
      to: installDir,
      label: "ALPHA_NON_PRODUCTION",
    })
  );

  fs.mkdirSync(installDir, { recursive: true });
  copyDir(payload, installDir);

  const dataDir = path.join(
    process.env.LOCALAPPDATA || installDir,
    "SCI OS X10",
    "data"
  );
  fs.mkdirSync(path.join(dataDir, "logs"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "diagnostics"), { recursive: true });
  fs.mkdirSync(path.join(installDir, "diagnostics-export"), { recursive: true });

  const launcher = path.join(installDir, "SCI OS X10.cmd");
  const alt = path.join(installDir, "SCI-OS-X10.cmd");
  const target = fs.existsSync(launcher) ? launcher : alt;

  const startMenu = path.join(
    process.env.APPDATA || "",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs"
  );
  if (fs.existsSync(startMenu)) {
    createShortcut({
      linkPath: path.join(startMenu, "SCI OS X10.lnk"),
      target,
      cwd: installDir,
    });
  }
  const desktop = path.join(
    process.env.USERPROFILE || "",
    "Desktop"
  );
  if (fs.existsSync(desktop)) {
    createShortcut({
      linkPath: path.join(desktop, "SCI OS X10.lnk"),
      target,
      cwd: installDir,
    });
  }

  // Uninstall helper (no registry — ALPHA)
  const uninstall = `@echo off
echo Uninstalling SCI OS X10 from ${installDir}
rmdir /s /q "${installDir}"
del "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\SCI OS X10.lnk" 2>nul
del "%USERPROFILE%\\Desktop\\SCI OS X10.lnk" 2>nul
echo Done.
pause
`;
  fs.writeFileSync(path.join(installDir, "Uninstall.cmd"), uninstall);

  const proof = {
    at: new Date().toISOString(),
    ok: true,
    installDir,
    launcher: target,
    payload,
    shortcuts: {
      startMenu: path.join(startMenu, "SCI OS X10.lnk"),
      desktop: path.join(desktop, "SCI OS X10.lnk"),
    },
    bundledNode: path.join(installDir, "runtime", "node", "node.exe"),
    note: "No system Node/pnpm installed",
  };
  fs.mkdirSync(path.join(installDir, "diagnostics-export", "packaging"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(installDir, "diagnostics-export", "packaging", "install-record.json"),
    JSON.stringify(proof, null, 2) + "\n"
  );

  console.log(JSON.stringify(proof, null, 2));
  console.log("\nInstalled. Launch via Start Menu / Desktop: SCI OS X10");
}

main();
