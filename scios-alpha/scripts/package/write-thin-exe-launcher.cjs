#!/usr/bin/env node
"use strict";

/**
 * Thin SCI-OS-X10.exe — Process.Start the proven SCI-OS-X10.cmd.
 * Not a second boot state machine. PKG wrapper remains P2 if unused.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = process.env.SCIOS_THIN_EXE_DIR
  ? path.resolve(process.env.SCIOS_THIN_EXE_DIR)
  : path.join(ROOT, "dist", "SCI-OS-X10");
const CS = path.join(OUT_DIR, "sci-os-thin-launcher.cs");
const EXE = path.join(OUT_DIR, "SCI-OS-X10.exe");

const source = `using System;
using System.Diagnostics;
using System.IO;
class SciOsThinLauncher {
  static int Main() {
    string dir = AppDomain.CurrentDomain.BaseDirectory;
    string cmd = Path.Combine(dir, "SCI-OS-X10.cmd");
    if (!File.Exists(cmd)) {
      Console.Error.WriteLine("SCI-OS-X10.cmd missing next to EXE");
      return 2;
    }
    ProcessStartInfo psi = new ProcessStartInfo();
    psi.FileName = cmd;
    psi.WorkingDirectory = dir;
    psi.UseShellExecute = false;
    Process p = Process.Start(psi);
    if (p == null) return 2;
    p.WaitForExit();
    return p.ExitCode;
  }
}
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(CS, source);

const csc =
  process.env.CSC_PATH ||
  "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";
let compiled = false;
let detail = "csc_missing";
if (fs.existsSync(csc)) {
  const r = spawnSync(csc, ["/nologo", "/t:exe", "/out:" + EXE, CS], {
    encoding: "utf8",
    windowsHide: true,
  });
  compiled = r.status === 0 && fs.existsSync(EXE);
  detail = compiled ? "thin_exe_delegates_to_cmd" : String(r.stderr || r.stdout || r.status);
}

const report = {
  schema: "sci-os-thin-exe-launcher/v1",
  ok: compiled,
  exe: EXE,
  delegatesTo: "SCI-OS-X10.cmd",
  secondBootStateMachine: false,
  pkgWrapper: "PKG_WRAPPER_MIGRATION",
  pkgWrapperSeverity: "P2",
  detail,
};
console.log(JSON.stringify(report, null, 2));
process.exit(0);
