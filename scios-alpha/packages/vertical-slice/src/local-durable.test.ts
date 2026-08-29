import { persistRun } from "./local-durable";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("local durable persistence truth", () => {
  it("returns PERSISTENCE_DEGRADED instead of throwing when write fails", () => {
    const prev = process.env.SCIOS_STATE_DIR;
    const blocked = path.join(os.tmpdir(), `sci-os-block-${Date.now()}`);
    fs.writeFileSync(blocked, "not-a-dir");
    process.env.SCIOS_STATE_DIR = blocked;
    try {
      const r = persistRun("run_test_degraded", { runId: "run_test_degraded" });
      expect(r.ok).toBe(false);
      expect(r.state).toBe("PERSISTENCE_DEGRADED");
      expect(r.error).toBeTruthy();
    } finally {
      if (prev === undefined) delete process.env.SCIOS_STATE_DIR;
      else process.env.SCIOS_STATE_DIR = prev;
      try {
        fs.unlinkSync(blocked);
      } catch {
        /* ignore */
      }
    }
  });

  it("sanitizes runId so files stay under state/runs", () => {
    const prev = process.env.SCIOS_STATE_DIR;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sci-os-durable-"));
    process.env.SCIOS_STATE_DIR = dir;
    try {
      const r = persistRun("..\\..\\evil/../run", { runId: "escape-test" });
      expect(r.ok).toBe(true);
      const runsDir = path.join(dir, "runs");
      const names = fs.readdirSync(runsDir);
      expect(names.length).toBeGreaterThan(0);
      for (const n of names) {
        expect(n.includes("/") || n.includes("\\")).toBe(false);
        const abs = path.resolve(runsDir, n);
        const rel = path.relative(runsDir, abs);
        expect(rel === ".." || rel.startsWith(`..${path.sep}`)).toBe(false);
      }
      expect(fs.existsSync(path.join(dir, "..", "evil.json"))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.SCIOS_STATE_DIR;
      else process.env.SCIOS_STATE_DIR = prev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses atomic write without leaving temp files", () => {
    const prev = process.env.SCIOS_STATE_DIR;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sci-os-atomic-"));
    process.env.SCIOS_STATE_DIR = dir;
    try {
      const r = persistRun("run_atomic", { runId: "run_atomic", outcome: { status: "OK" } });
      expect(r.ok).toBe(true);
      expect(r.state).toBe("PERSISTED");
      const runsDir = path.join(dir, "runs");
      const temps = fs.readdirSync(runsDir).filter((n) => n.includes(".tmp"));
      expect(temps.length).toBe(0);
      expect(fs.existsSync(path.join(runsDir, "run_atomic.json"))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.SCIOS_STATE_DIR;
      else process.env.SCIOS_STATE_DIR = prev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
