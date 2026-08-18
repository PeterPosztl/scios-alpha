import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  SystemInventoryEngine,
  SystemCapabilityGraph,
  DependencyGraphEngine,
  writeJson,
  newId,
} from "./inventory.js";
import { StartupDigitalTwin } from "./digital-twin.js";
import {
  FailureObservationEngine,
  FailureClassificationEngine,
  UnknownFailureEngine,
  FailureHypothesisEngine,
  RootCauseRankingEngine,
} from "./observe.js";
import { RepairRecipeRegistry } from "./recipes/registry.js";
import {
  TransactionalRepairExecutor,
  VerificationEngine,
  RecoveryMemoryEngine,
  RecoveryBudgetController,
  ExternalBlockerClassifier,
  CapabilityCompletionEngine,
  RuntimeSupervisionEngine,
  EvidenceVerifier,
  HumanEscalationRouter,
  RecoveryLearningEngine,
} from "./repair.js";
import type { FinalVerdict, MetaState, RepairAttempt } from "./types.js";

export interface MetaRecoveryOptions {
  appRoot: string;
  dryRun?: boolean;
  proveOnly?: boolean;
  resume?: boolean;
  allowR3?: boolean;
  /** Relative under diagnostics-export/ (default meta-recovery) */
  artifactDir?: string;
}

export class MetaRecoveryController {
  private state: MetaState = "DISCOVER";
  private correlationId = newId("meta");

  async run(opts: MetaRecoveryOptions) {
    const dryRun = !!opts.dryRun;
    const allowR3 = !!opts.allowR3;
    const outDir = join(
      opts.appRoot,
      "diagnostics-export",
      opts.artifactDir || "meta-recovery"
    );
    const attempts: RepairAttempt[] = [];
    const rejected: RepairAttempt[] = [];
    const rolledBack: RepairAttempt[] = [];
    const applied: RepairAttempt[] = [];

    // DISCOVER
    this.state = "DISCOVER";
    const inventory = new SystemInventoryEngine(opts.appRoot).collect();
    writeJson(outDir, "system-inventory.json", inventory);

    // MODEL
    this.state = "MODEL";
    const nodes = new SystemCapabilityGraph().build(inventory);
    const dep = new DependencyGraphEngine();
    const graph = dep.toEdges(nodes);
    writeJson(outDir, "capability-inventory.json", { nodes });
    writeJson(outDir, "dependency-graph.json", graph);

    const twin = new StartupDigitalTwin().diff(nodes);
    writeJson(outDir, "startup-digital-twin.json", twin);
    try {
      const hostTwinSrc = join(opts.appRoot, "diagnostics-export", "host", "digital-twin.json");
      if (existsSync(hostTwinSrc)) {
        const hostSnap = JSON.parse(readFileSync(hostTwinSrc, "utf8"));
        writeJson(outDir, "host-digital-twin.json", {
          schema: "sci-os-meta-recovery-host-twin-input/v1",
          note: "WHI-011 observe-only input — no repair in this slice",
          snapshot: hostSnap,
        });
      }
    } catch {
      /* optional host input */
    }

    const completion = new CapabilityCompletionEngine().scan(opts.appRoot);
    writeJson(outDir, "capability-completion-report.json", completion);

    // OBSERVE
    this.state = "OBSERVE";
    const observations = await new FailureObservationEngine().observe(opts.appRoot);
    writeJson(outDir, "failure-observations.json", { correlationId: this.correlationId, observations });

    // CLASSIFY
    this.state = "CLASSIFY";
    const classified = new FailureClassificationEngine().classify(observations);

    // FORM_HYPOTHESES
    this.state = "FORM_HYPOTHESES";
    const knownHyps = new FailureHypothesisEngine().form(observations);
    const unknownHyps = new UnknownFailureEngine().hypothesize(observations);
    const hypotheses = [...knownHyps, ...unknownHyps];
    writeJson(outDir, "failure-hypotheses.json", { hypotheses, classified });

    // RANK
    this.state = "RANK_ROOT_CAUSES";
    const ranked = new RootCauseRankingEngine().rank(hypotheses);
    writeJson(outDir, "root-cause-ranking.json", { ranked });

    // Always include documentation recipes for known ALPHA gaps
    const registry = new RepairRecipeRegistry();
    const planRecipes = [
      ...ranked.map((h) => h.repairCandidate).filter(Boolean),
      "recipe.document_missing_electron",
      "recipe.document_missing_workers",
      "recipe.accept_alpha_no_db",
    ] as string[];
    const uniqueRecipes = [...new Set(planRecipes)];
    writeJson(outDir, "remediation-plan.json", {
      correlationId: this.correlationId,
      order: uniqueRecipes,
      rankingCriteria: [
        "safety",
        "reversibility",
        "evidence_confidence",
        "minimal_impact",
        "expected_success",
      ],
    });

    // PLAN → POLICY → SNAPSHOT → SANDBOX → APPLY → VERIFY loop
    const budget = new RecoveryBudgetController();
    const executor = new TransactionalRepairExecutor(opts.appRoot);
    const triedKeys = new Set<string>();

    for (const recipeId of uniqueRecipes) {
      if (!budget.canAttempt(recipeId)) continue;
      const recipe = registry.get(recipeId);
      if (!recipe) continue;
      const key = `${recipeId}|${recipe.riskClass}`;
      if (triedKeys.has(key)) continue;
      triedKeys.add(key);

      this.state = "POLICY_CHECK";
      this.state = "SNAPSHOT";
      this.state = "SANDBOX_TEST";
      this.state = "APPLY_REPAIR";
      budget.record(recipeId);
      const attempt = await executor.execute(recipe, { dryRun, allowR3 });
      attempts.push(attempt);
      if (attempt.result === "rejected_policy") rejected.push(attempt);
      else if (attempt.result === "rolled_back") rolledBack.push(attempt);
      else if (attempt.result === "success") applied.push(attempt);
    }

    writeJson(outDir, "repair-attempts.json", { attempts });
    writeJson(outDir, "rollback-report.json", { rolledBack });

    // VERIFY / START / PROVE
    this.state = "VERIFY";
    const verification = await new VerificationEngine().verify();
    this.state = "PROVE_READINESS";

    const blockers = new ExternalBlockerClassifier();
    const externalReports = [];
    for (const cap of ["DesktopElectron", "PostgreSQL", "QueueWorkers"]) {
      const b = blockers.classify(
        cap,
        attempts.map((a) => a.recipeId)
      );
      if (b.proven) externalReports.push(b.report);
    }
    writeJson(outDir, "external-blocker-report.json", { blockers: externalReports });

    const supervision = await new RuntimeSupervisionEngine().tick();
    const memory = new RecoveryMemoryEngine(opts.appRoot);
    const memEntry = {
      correlationId: this.correlationId,
      machineFingerprint: inventory.fingerprint,
      at: new Date().toISOString(),
      failureSignature: classified.map((c) => c.failureClass).join("|") || "NONE",
      successfulRecipes: applied.map((a) => a.recipeId),
      failedRecipes: attempts.filter((a) => a.result === "failed").map((a) => a.recipeId),
      verification,
    };
    memory.append(memEntry);
    writeJson(outDir, "recovery-memory.json", memory.load());
    writeJson(outDir, "learning.json", new RecoveryLearningEngine().learn(memEntry));

    const requiredArtifacts = [
      "system-inventory.json",
      "capability-inventory.json",
      "dependency-graph.json",
      "startup-digital-twin.json",
      "failure-observations.json",
      "failure-hypotheses.json",
      "root-cause-ranking.json",
      "remediation-plan.json",
      "repair-attempts.json",
      "rollback-report.json",
      "recovery-memory.json",
      "capability-completion-report.json",
      "external-blocker-report.json",
    ];
    const evidence = new EvidenceVerifier().validateArtifacts(outDir, requiredArtifacts);

    const coreOk = verification.controlPlane && verification.cockpit;
    const requiredMissing = twin.missingRequired.filter(
      (id) => !["ControlPlaneBackend", "CockpitHttp"].includes(id) || !coreOk
    );

    let verdict: FinalVerdict;
    if (coreOk && requiredMissing.length === 0 && externalReports.length === 0) {
      verdict = "SYSTEM_READY";
      this.state = "READY";
    } else if (coreOk) {
      verdict = "SYSTEM_DEGRADED";
      this.state = "SAFE_MODE";
    } else if (externalReports.length && !coreOk) {
      verdict = "EXTERNAL_BLOCKER_PROVEN";
      this.state = "EXTERNAL_BLOCKER";
      new HumanEscalationRouter().route(externalReports[0] ?? { proven: true });
    } else if (!coreOk && attempts.length === 0) {
      verdict = "SYSTEM_NO_GO";
      this.state = "NO_GO";
    } else if (!coreOk) {
      // Core down but we have remediations exhausted → blocker or NO_GO
      verdict = dryRun ? "SYSTEM_DEGRADED" : "SYSTEM_NO_GO";
      this.state = dryRun ? "SAFE_MODE" : "NO_GO";
    } else {
      verdict = "SYSTEM_DEGRADED";
    }

    // If core healthy but optional external gaps — still DEGRADED with proven blockers documented
    if (coreOk && externalReports.length) {
      verdict = "SYSTEM_DEGRADED";
    }

    const proof = {
      correlationId: this.correlationId,
      at: new Date().toISOString(),
      state: this.state,
      verdict,
      dryRun,
      verification,
      evidenceOk: evidence.ok,
      missingArtifacts: evidence.missing,
      attempts: attempts.length,
      applied: applied.length,
      rejected: rejected.length,
      rolledBack: rolledBack.length,
      note: "ALPHA — no false READY; optional infra/desktop documented as absent",
    };
    writeJson(outDir, "meta-recovery-proof.json", proof);
    writeJson(outDir, "final-readiness-proof.json", {
      ...proof,
      startupPackCanonical: "installer/scripts/start-sci-os.cjs",
      metaLayer: "packages/meta-recovery",
    });
    writeJson(outDir, "meta-recovery-signoff.json", {
      signedOffBy: "MetaRecoveryController",
      verdict,
      correlationId: this.correlationId,
      evidencePaths: requiredArtifacts.map((f) => join(outDir, f)),
    });

    return {
      correlationId: this.correlationId,
      state: this.state,
      verdict,
      inventory,
      graph,
      twin,
      observations,
      classified,
      ranked,
      attempts,
      rejected,
      applied,
      rolledBack,
      completion,
      externalReports,
      supervision,
      verification,
      outDir,
      evidence,
    };
  }
}
