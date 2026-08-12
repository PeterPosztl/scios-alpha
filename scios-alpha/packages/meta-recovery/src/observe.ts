import { spawnSync } from "node:child_process";
import http from "node:http";
import type { FailureObservation, Hypothesis } from "./types.js";
import { newId } from "./inventory.js";

function httpGet(url: string, timeoutMs = 2000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () =>
        resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
      );
    });
    req.on("error", (e) => resolve({ status: 0, body: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "timeout" });
    });
  });
}

export class FailureObservationEngine {
  async observe(appRoot: string): Promise<FailureObservation[]> {
    const out: FailureObservation[] = [];
    const cp = await httpGet("http://127.0.0.1:5200/healthz");
    const ui = await httpGet("http://127.0.0.1:5230/healthz");

    if (cp.status !== 200) {
      out.push({
        id: newId("obs"),
        at: new Date().toISOString(),
        phase: "backend_health",
        message: `control-plane health status=${cp.status} ${cp.body}`,
        failureClass: "HEALTH_TIMEOUT",
        known: true,
        evidence: ["http://127.0.0.1:5200/healthz"],
      });
    }
    if (ui.status !== 200) {
      out.push({
        id: newId("obs"),
        at: new Date().toISOString(),
        phase: "cockpit_health",
        message: `cockpit health status=${ui.status}`,
        failureClass: "DESKTOP_LOAD_FAILED",
        known: true,
        evidence: ["http://127.0.0.1:5230/healthz"],
      });
    }

    if (!process.env.DATABASE_URL) {
      out.push({
        id: newId("obs"),
        at: new Date().toISOString(),
        phase: "infrastructure",
        message: "DATABASE_URL not configured (ALPHA optional)",
        failureClass: "CONFIG_MISSING",
        known: true,
        evidence: ["env"],
      });
    }

    const smoke = spawnSync("pnpm", ["--filter", "@scios/vertical-slice", "smoke"], {
      cwd: appRoot,
      encoding: "utf8",
      shell: true,
    });
    if (smoke.status !== 0) {
      out.push({
        id: newId("obs"),
        at: new Date().toISOString(),
        phase: "vertical_slice",
        message: "vertical-slice smoke failed",
        failureClass: "BACKEND_CRASHED",
        known: true,
        evidence: [(smoke.stdout || "").slice(-300)],
      });
    }

    // Synthetic unknown marker only if contradictory signals
    if (cp.status === 200 && ui.status !== 200) {
      out.push({
        id: newId("obs"),
        at: new Date().toISOString(),
        phase: "inconsistent",
        message: "backend healthy but cockpit unhealthy",
        failureClass: "UNKNOWN_STARTUP_FAILURE",
        known: false,
        evidence: ["inconsistent_health"],
      });
    }

    return out;
  }
}

export class FailureClassificationEngine {
  classify(obs: FailureObservation[]) {
    return obs.map((o) => ({
      ...o,
      domain: o.failureClass.includes("DOCKER")
        ? "DOCKER"
        : o.failureClass.includes("DATABASE") || o.message.includes("DATABASE")
          ? "DATABASE"
          : o.failureClass.includes("REDIS") || o.failureClass.includes("QUEUE")
            ? "REDIS_QUEUE"
            : o.failureClass.includes("HEALTH") || o.failureClass.includes("BACKEND")
              ? "BACKEND_API"
              : o.failureClass.includes("DESKTOP")
                ? "DESKTOP"
                : o.known
                  ? "KNOWN"
                  : "UNKNOWN",
    }));
  }
}

export class UnknownFailureEngine {
  hypothesize(obs: FailureObservation[]): Hypothesis[] {
    return obs
      .filter((o) => !o.known)
      .map((o) => ({
        hypothesisId: newId("hyp"),
        explanation: `Unknown failure in phase ${o.phase}: ${o.message}`,
        supportingEvidence: o.evidence,
        contradictingEvidence: [],
        affectedCapability: o.phase,
        confidence: 0.35,
        diagnosticAction: "capture_logs_and_retry_health",
        repairCandidate: "recipe.observe_only",
        risk: "R0",
        rollback: "none",
        verificationMethod: "re_observe",
      }));
  }
}

export class FailureHypothesisEngine {
  form(obs: FailureObservation[]): Hypothesis[] {
    const hyps: Hypothesis[] = [];
    for (const o of obs) {
      if (o.failureClass === "HEALTH_TIMEOUT" || o.phase === "backend_health") {
        hyps.push({
          hypothesisId: newId("hyp"),
          explanation: "Control-plane not listening or crashed — restart via startup pack",
          supportingEvidence: o.evidence,
          contradictingEvidence: [],
          affectedCapability: "ControlPlaneBackend",
          confidence: 0.82,
          diagnosticAction: "probe_/healthz",
          repairCandidate: "recipe.start_control_plane",
          risk: "R2",
          rollback: "sci:shutdown",
          verificationMethod: "healthz_200",
        });
      }
      if (o.phase === "cockpit_health") {
        hyps.push({
          hypothesisId: newId("hyp"),
          explanation: "Cockpit UI down — restart cockpit service",
          supportingEvidence: o.evidence,
          contradictingEvidence: [],
          affectedCapability: "CockpitHttp",
          confidence: 0.8,
          diagnosticAction: "probe_cockpit_healthz",
          repairCandidate: "recipe.start_cockpit",
          risk: "R2",
          rollback: "sci:shutdown",
          verificationMethod: "healthz_200",
        });
      }
      if (o.message.includes("DATABASE_URL")) {
        hyps.push({
          hypothesisId: newId("hyp"),
          explanation: "Postgres optional in ALPHA — degrade, do not invent credentials",
          supportingEvidence: o.evidence,
          contradictingEvidence: [],
          affectedCapability: "PostgreSQL",
          confidence: 0.95,
          diagnosticAction: "confirm_alpha_mode",
          repairCandidate: "recipe.accept_alpha_no_db",
          risk: "R1",
          rollback: "none",
          verificationMethod: "config_redacted_ok",
        });
      }
      if (o.phase === "vertical_slice") {
        hyps.push({
          hypothesisId: newId("hyp"),
          explanation: "Vertical slice smoke failed — rebuild and rerun leaf boot repair",
          supportingEvidence: o.evidence,
          contradictingEvidence: [],
          affectedCapability: "VerticalSlice",
          confidence: 0.78,
          diagnosticAction: "pnpm_filter_smoke",
          repairCandidate: "recipe.leaf_boot_repair",
          risk: "R2",
          rollback: "git checkout fixtures",
          verificationMethod: "smoke_exit_0",
        });
      }
    }
    return hyps;
  }
}

export class RootCauseRankingEngine {
  rank(hyps: Hypothesis[]) {
    return [...hyps].sort((a, b) => b.confidence - a.confidence);
  }
}
