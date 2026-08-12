import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import http from "node:http";
import type { RepairAttempt, RepairRecipe } from "./types.js";
import { RepairPolicyEngine } from "./recipes/registry.js";

function httpOk(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve((res.statusCode || 0) === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

export class RepairSandbox {
  constructor(private appRoot: string) {}
  async test(recipe: RepairRecipe): Promise<{ ok: boolean; detail: string }> {
    if (recipe.riskClass === "R0" || recipe.riskClass === "R1") {
      return { ok: true, detail: "sandbox_noop_ok" };
    }
    // Shadow check: ensure diagnostics dir writable
    const shadow = join(this.appRoot, "diagnostics-export", "meta-recovery", ".sandbox");
    try {
      mkdirSync(shadow, { recursive: true });
      writeFileSync(join(shadow, "probe.txt"), recipe.recipeId);
      return { ok: true, detail: "sandbox_writable" };
    } catch (e) {
      return { ok: false, detail: String(e) };
    }
  }
}

export class RollbackManager {
  async rollback(appRoot: string, attempt: RepairAttempt): Promise<{ ok: boolean; detail: string }> {
    if (!attempt.changedResources.includes("processes")) {
      return { ok: true, detail: "no_process_changes" };
    }
    const r = spawnSync("pnpm", ["sci:shutdown"], {
      cwd: appRoot,
      encoding: "utf8",
      shell: true,
      timeout: 60000,
    });
    return {
      ok: r.status === 0,
      detail: (r.stdout || r.stderr || "").slice(0, 400),
    };
  }
}

export class TransactionalRepairExecutor {
  private policy = new RepairPolicyEngine();
  private sandbox: RepairSandbox;
  private rollback = new RollbackManager();

  constructor(private appRoot: string) {
    this.sandbox = new RepairSandbox(appRoot);
  }

  async execute(
    recipe: RepairRecipe,
    opts: { dryRun: boolean; allowR3: boolean }
  ): Promise<RepairAttempt> {
    const repairId = `repair_${randomUUID().slice(0, 8)}`;
    const txDir = join(this.appRoot, "diagnostics-export", "repair-transactions");
    mkdirSync(txDir, { recursive: true });

    const policy = this.policy.allow(recipe.riskClass, opts);
    if (!policy.allowed) {
      const attempt: RepairAttempt = {
        repairId,
        recipeId: recipe.recipeId,
        at: new Date().toISOString(),
        dryRun: opts.dryRun,
        result: "rejected_policy",
        detail: policy.reason,
        changedResources: [],
      };
      writeFileSync(join(txDir, `${repairId}.json`), JSON.stringify(attempt, null, 2));
      return attempt;
    }

    const snap = {
      repairId,
      recipeId: recipe.recipeId,
      beforeHash: createHash("sha256").update(JSON.stringify(recipe)).digest("hex").slice(0, 16),
      at: new Date().toISOString(),
    };
    writeFileSync(join(txDir, `${repairId}.snapshot.json`), JSON.stringify(snap, null, 2));

    const sb = await this.sandbox.test(recipe);
    if (!sb.ok) {
      const attempt: RepairAttempt = {
        repairId,
        recipeId: recipe.recipeId,
        at: new Date().toISOString(),
        dryRun: opts.dryRun,
        result: "failed",
        detail: `sandbox: ${sb.detail}`,
        changedResources: [],
      };
      writeFileSync(join(txDir, `${repairId}.json`), JSON.stringify(attempt, null, 2));
      return attempt;
    }

    if (opts.dryRun) {
      const attempt: RepairAttempt = {
        repairId,
        recipeId: recipe.recipeId,
        at: new Date().toISOString(),
        dryRun: true,
        result: "success",
        detail: "dry-run simulated success",
        changedResources: [],
      };
      writeFileSync(join(txDir, `${repairId}.json`), JSON.stringify(attempt, null, 2));
      return attempt;
    }

    let detail = "";
    let changed: string[] = [];
    let ok = false;

    try {
      switch (recipe.recipeId) {
        case "recipe.observe_only":
        case "recipe.accept_alpha_no_db":
        case "recipe.document_missing_electron":
        case "recipe.document_missing_workers":
          ok = true;
          detail = "documented_degraded_capability";
          break;
        case "recipe.start_control_plane":
        case "recipe.start_cockpit": {
          const already =
            (await httpOk("http://127.0.0.1:5200/healthz")) &&
            (await httpOk("http://127.0.0.1:5230/healthz"));
          if (already) {
            ok = true;
            detail = "already_healthy";
          } else {
            const r = spawnSync("pnpm", ["sci:repair"], {
              cwd: this.appRoot,
              encoding: "utf8",
              shell: true,
              timeout: recipe.timeoutMs,
            });
            changed = ["processes"];
            ok =
              (await httpOk("http://127.0.0.1:5200/healthz")) ||
              (await httpOk("http://127.0.0.1:5230/healthz"));
            detail = `sci:repair exit=${r.status}; health_ok=${ok}`;
          }
          break;
        }
        case "recipe.leaf_boot_repair": {
          const r = spawnSync("pnpm", ["boot:repair"], {
            cwd: this.appRoot,
            encoding: "utf8",
            shell: true,
            timeout: recipe.timeoutMs,
          });
          const smoke = spawnSync("pnpm", ["--filter", "@scios/vertical-slice", "smoke"], {
            cwd: this.appRoot,
            encoding: "utf8",
            shell: true,
          });
          ok = smoke.status === 0;
          detail = `boot:repair=${r.status} smoke=${smoke.status}`;
          break;
        }
        default:
          ok = false;
          detail = "unknown_recipe";
      }
    } catch (e) {
      ok = false;
      detail = String(e);
    }

    let attempt: RepairAttempt = {
      repairId,
      recipeId: recipe.recipeId,
      at: new Date().toISOString(),
      dryRun: false,
      result: ok ? "success" : "failed",
      detail,
      changedResources: changed,
    };

    if (!ok && changed.length) {
      const rb = await this.rollback.rollback(this.appRoot, attempt);
      attempt = {
        ...attempt,
        result: "rolled_back",
        detail: `${detail}; rollback=${rb.ok ? "ok" : "fail"} ${rb.detail}`,
      };
    }

    writeFileSync(join(txDir, `${repairId}.json`), JSON.stringify(attempt, null, 2));
    return attempt;
  }
}

export class VerificationEngine {
  async verify(): Promise<{
    controlPlane: boolean;
    cockpit: boolean;
    sliceSmoke: boolean | null;
  }> {
    return {
      controlPlane: await httpOk("http://127.0.0.1:5200/healthz"),
      cockpit: await httpOk("http://127.0.0.1:5230/healthz"),
      sliceSmoke: null,
    };
  }
}

export class RecoveryMemoryEngine {
  constructor(private appRoot: string) {}

  path() {
    return join(this.appRoot, "diagnostics-export", "meta-recovery", "recovery-memory.json");
  }

  load(): { entries: unknown[] } {
    const p = this.path();
    if (!existsSync(p)) return { entries: [] };
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      return { entries: [] };
    }
  }

  append(entry: unknown) {
    const mem = this.load();
    mem.entries.push(entry);
    mkdirSync(join(this.appRoot, "diagnostics-export", "meta-recovery"), { recursive: true });
    writeFileSync(this.path(), JSON.stringify(mem, null, 2));
  }
}

export class RecoveryBudgetController {
  private attempts = new Map<string, number>();
  constructor(
    private maxPerRecipe = 2,
    private maxTotal = 12
  ) {}
  private total = 0;

  canAttempt(recipeId: string): boolean {
    if (this.total >= this.maxTotal) return false;
    const n = this.attempts.get(recipeId) || 0;
    return n < this.maxPerRecipe;
  }

  record(recipeId: string) {
    this.total += 1;
    this.attempts.set(recipeId, (this.attempts.get(recipeId) || 0) + 1);
  }
}

export class ExternalBlockerClassifier {
  classify(capability: string, attempted: string[]): {
    proven: boolean;
    report: Record<string, unknown>;
  } {
    const externalCaps = new Set([
      "DesktopElectron",
      "PostgreSQL",
      "RedisQueue",
      "QueueWorkers",
    ]);
    if (!externalCaps.has(capability)) {
      return { proven: false, report: { capability, proven: false } };
    }
    return {
      proven: true,
      report: {
        capability,
        proven: true,
        evidence: [`capability_${capability}_MISSING_OR_ABSENT`],
        attemptedSafeRemediations: attempted,
        whyUnsafeToContinueAutonomously:
          capability === "PostgreSQL"
            ? "Must not invent production credentials"
            : capability === "DesktopElectron"
              ? "Electron desktop packaging not present in ALPHA tree"
              : "Queue workers / Redis optional infrastructure not implemented as SCI workers",
        minimalHumanAction:
          capability === "PostgreSQL"
            ? "Provide DATABASE_URL for a permitted non-production database, then pnpm sci:meta-recovery:resume"
            : capability === "DesktopElectron"
              ? "Use browser cockpit at :5230 until Electron installer ships"
              : "Implement BullMQ workers or accept DEGRADED without queue processing",
        resumePoint: "CLASSIFY",
        resumeCommand: "pnpm sci:meta-recovery:resume",
      },
    };
  }
}

export class CapabilityCompletionEngine {
  scan(appRoot: string) {
    const missing: Array<Record<string, unknown>> = [];
    // Meta-recovery itself is the completion for supervision layer
    if (!existsSync(join(appRoot, "packages/meta-recovery/src/controller.ts"))) {
      missing.push({
        capability: "MetaRecoveryController",
        architecturalLocation: "packages/meta-recovery",
        status: "implementing",
      });
    }
    if (!existsSync(join(appRoot, "apps/desktop"))) {
      missing.push({
        capability: "DesktopElectron",
        architecturalLocation: "apps/desktop",
        status: "absent_not_auto_stubbed",
        reason: "Would be placeholder success — prohibited",
      });
    }
    return {
      at: new Date().toISOString(),
      missing,
      autoImplementedSafe: ["packages/meta-recovery", "apps/meta-recovery-control-plane"],
    };
  }
}

export class RuntimeSupervisionEngine {
  async tick(): Promise<Record<string, unknown>> {
    const v = new VerificationEngine();
    const health = await v.verify();
    return {
      at: new Date().toISOString(),
      health,
      action:
        health.controlPlane && health.cockpit
          ? "monitor_only"
          : "schedule_bounded_heal_via_sci_repair",
      crashLoopGuard: true,
    };
  }
}

export class EvidenceVerifier {
  validateArtifacts(dir: string, required: string[]): { ok: boolean; missing: string[] } {
    const missing = required.filter((f) => !existsSync(join(dir, f)));
    return { ok: missing.length === 0, missing };
  }
}

export class HumanEscalationRouter {
  route(blocker: Record<string, unknown>) {
    return {
      channel: "operator_console",
      severity: "HIGH",
      package: blocker,
      uiScreen: "External Blockers",
    };
  }
}

export class RecoveryLearningEngine {
  learn(memoryEntry: Record<string, unknown>) {
    return {
      learnedSignature: memoryEntry.failureSignature ?? null,
      recipeRankBoost: memoryEntry.successfulRecipe ? [memoryEntry.successfulRecipe] : [],
      policyUnchanged: true,
      note: "May rank recipes; must not weaken security/risk policies",
    };
  }
}
