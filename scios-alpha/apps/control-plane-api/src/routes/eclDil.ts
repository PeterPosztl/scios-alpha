/**
 * ECL / DIL / AI-proposal HTTP surface.
 * Composes into Control Plane — no second OS, no auto-trade.
 * ALPHA_NON_PRODUCTION
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createLogger, metrics } from "@scios/observability";
import {
  createEclDilRuntime,
  HorizonSchema,
  ALPHA_LABEL,
  ECL_DIL_HONESTY,
  ENTERPRISE_HOOKS,
  BLUEPRINT_HOOKS,
  SCI_SYSTEM_IDENTITY,
  buildDeploymentInventory,
  REALISTIC_SIM_HOOKS,
} from "@scios/ecl-dil";
import { runProfessionalWorkspaceCompilation, runWorkspaceValidationWave, runDeepWorkspaceValidationWave, runWorkspaceActivationWave, runWorkspaceStabilizationWave, runDigitalActivationWave, runPrecisionUpgradeWave, runCyberResearchBridgeWave, runActivationReviewWave, runEnterprisePrepWave, runAutomationPrepWave, runVisibilityPrepWave, runVisibilityActivationWave, runVisibilityDeepWave, runExplainabilityPrepWave, runExplainVisibilityWave, runDigitalWorkspaceComputeWave, runActivationPassWave, runPhaseCoreWave, runPhaseCoreBlueprintsWave, runAuditEngineCoreWave, runLimitEngineCoreWave, runLedgerCoreWave, runDomainFabricWave, runKgFabricWave, runScenarioFabricWave, runCausalFabricWave, runGovernanceFabricWave, runInfraFabricWave, runSecurityFabricWave, runOsFabricWave, runCursorRunbookWave } from "../professionalCompile.js";
import { dispatchEngineSuite } from "./engine-suite.js";
import { ProfessionBlueprintSchema, FamilyUxV3Schema, HeroV3Schema } from "@scios/ecl-dil";
import {
  composeProfessionBlueprint,
  professionBlueprintCatalog,
  composeFamilyUxV3,
  composeHeroV3,
  masterExecutionBox,
} from "@scios/professional-domain-registry/blueprint";

export type SendJson = (res: ServerResponse, status: number, body: unknown) => void;
export type ReadJson = (req: IncomingMessage) => Promise<unknown>;

const runtime = createEclDilRuntime();
const log = createLogger("ecl-dil");

function envelope(data: unknown, extra: Record<string, unknown> = {}) {
  return {
    schema: "sci-os-ecl-dil/v1",
    label: ALPHA_LABEL,
    autoTrade: false as const,
    productionEligible: false,
    winRateClaim: null,
    ...extra,
    data,
  };
}

function readEnvelope(data: unknown, extra: Record<string, unknown> = {}) {
  return envelope(data, { persisted: false, ...extra });
}

function horizonOf(url: URL) {
  const raw = url.searchParams.get("horizon") || "24h";
  const parsed = HorizonSchema.safeParse(raw);
  return parsed.success ? parsed.data : "24h";
}

function infraPayload() {
  return {
    ...ENTERPRISE_HOOKS,
    oidc: ECL_DIL_HONESTY.oidc,
    otlp: ECL_DIL_HONESTY.otlp,
    ledger: ECL_DIL_HONESTY.ledger,
    liveFeeds: runtime.feedStatus().liveAdapter,
    feedRegistry: runtime.feedStatus().registry,
    actual: {
      oidc: ECL_DIL_HONESTY.oidc,
      otlp: ECL_DIL_HONESTY.otlp,
      ledger: ECL_DIL_HONESTY.ledger,
      liveFeeds: runtime.feedStatus().liveAdapter,
      liveCalibration: ECL_DIL_HONESTY.liveCalibration,
      boot: SCI_SYSTEM_IDENTITY.boot,
      controlPlane: SCI_SYSTEM_IDENTITY.controlPlane,
      shell: SCI_SYSTEM_IDENTITY.shell,
      autoTrade: false as const,
      feedLiveCertified: 0 as const,
    },
  };
}

function workspace(url: URL) {
  const horizon = horizonOf(url);
  const snap = runtime.snapshot();
  return {
    horizon,
    rows: runtime.composeWorkspaceRows(horizon),
    guardrail: snap.guardrail,
    bankroll: snap.bankroll,
    session: snap.session,
    sessionRiskEvents: snap.sessionRiskEvents,
    proposals: runtime.proposals(),
    signals: runtime.signals(),
    honesty: ECL_DIL_HONESTY,
    calibration: runtime.calibration(),
    trackRecord: runtime.trackRecord().slice(0, 40),
    feeds: runtime.feedStatus(),
    infra: infraPayload(),
    realisticSim: runtime.realisticSimulation(),
    professional: runtime.roleProfessional(),
  };
}

export async function eclDilRouter(opts: {
  method: string;
  path: string;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  sendJson: SendJson;
  readJson: ReadJson;
}): Promise<boolean> {
  const { method, path, url, req, res, sendJson, readJson } = opts;
  if (
    !path.startsWith("/v1/ecl") &&
    !path.startsWith("/v1/dil") &&
    !path.startsWith("/v1/ai/proposals") &&
    !path.startsWith("/v1/ai/signals") &&
    !path.startsWith("/v1/ledger") &&
    path !== "/v1/pnl-book" &&
    path !== "/v1/risk-book"
  ) {
    return false;
  }

  try {
    const t0 = Date.now();
    metrics.inc("ecl_dil.requests");
    log.info("ecl_dil_request", { method, path });
    if (method === "GET" && path === "/v1/ecl/snapshot") {
      sendJson(res, 200, readEnvelope(runtime.snapshot()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/instruments") {
      sendJson(res, 200, readEnvelope(runtime.snapshot().instruments));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/positions") {
      sendJson(res, 200, readEnvelope(runtime.snapshot().positions));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/trades") {
      sendJson(res, 200, readEnvelope(runtime.snapshot().trades));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/bankroll") {
      sendJson(res, 200, readEnvelope(runtime.snapshot().bankroll));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/sessions") {
      const s = runtime.snapshot();
      sendJson(res, 200, readEnvelope([s.session], { sessionRiskEvents: s.sessionRiskEvents }));
      return true;
    }
    if (method === "GET" && (path === "/v1/ecl/risk" || path === "/v1/ecl/risk/score")) {
      const s = runtime.snapshot();
      sendJson(
        res,
        200,
        readEnvelope({
          bucket: s.bucket,
          guardrail: s.guardrail,
          drawdownScore: s.session.maxDrawdown,
          volatilityScore: s.session.volatility,
          riskScore: s.guardrail.breaches.length ? 0.85 : 0.32,
        })
      );
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/audit") {
      sendJson(res, 200, readEnvelope(runtime.audit()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/audit/decisions") {
      sendJson(res, 200, readEnvelope(runtime.auditByKind("decision")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/audit/rules") {
      sendJson(res, 200, readEnvelope(runtime.auditByKind("rule")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/audit/sessions") {
      sendJson(res, 200, readEnvelope(runtime.auditByKind("session")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/report") {
      sendJson(res, 200, readEnvelope(runtime.reports()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/report/pnl") {
      sendJson(res, 200, readEnvelope(runtime.report("pnl")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/report/volatility") {
      sendJson(res, 200, readEnvelope(runtime.report("volatility")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/report/risk") {
      sendJson(res, 200, readEnvelope(runtime.report("risk_exposure")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/report/edge") {
      sendJson(res, 200, readEnvelope(runtime.report("edge_stability")));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/guardrail") {
      sendJson(res, 200, readEnvelope(runtime.guardrail()));
      return true;
    }
    if (
      path.startsWith("/v1/ecl/engine/") ||
      path.startsWith("/v1/ledger") ||
      path === "/v1/pnl-book" ||
      path === "/v1/risk-book" ||
      path === "/v1/ecl/clients"
    ) {
      const body = method === "GET" || method === "HEAD" ? {} : await readJson(req);
      const handled = await dispatchEngineSuite({
        method,
        path,
        url,
        body,
        runtime,
        res,
        sendJson,
        envelope,
      });
      if (handled) return true;
    }
    if (method === "PUT" && path === "/v1/ecl/guardrail") {
      const body = (await readJson(req)) as Record<string, number>;
      const patch: Record<string, number> = {};
      for (const k of ["maxDailyLoss", "maxPositionSize", "maxConcentration", "kellyCap"] as const) {
        if (typeof body[k] === "number") patch[k] = body[k];
      }
      const next = runtime.setLimits(patch);
      sendJson(res, 200, envelope(next));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/workspace") {
      sendJson(
        res,
        200,
        readEnvelope({
          snapshot: runtime.snapshot(),
          reports: runtime.reports(),
          audit: runtime.audit().slice(0, 40),
          calibration: runtime.calibration(),
          trackRecord: runtime.trackRecord().slice(0, 20),
          honesty: ECL_DIL_HONESTY,
          feeds: runtime.feedStatus(),
          infra: infraPayload(),
          realisticSim: runtime.realisticSimulation(),
        })
      );
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/infra") {
      sendJson(res, 200, readEnvelope(infraPayload()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/architecture") {
      sendJson(
        res,
        200,
        readEnvelope({
          boot: SCI_SYSTEM_IDENTITY.boot,
          controlPlane: SCI_SYSTEM_IDENTITY.controlPlane,
          shell: SCI_SYSTEM_IDENTITY.shell,
          layers: ["ECL finance/risk/reporting", "DIL probability/edge/risk/scenario", "AI proposals", "simulated track-record", "realistic simulation (SIMULATION_ONLY)"],
          feeds: runtime.feedStatus(),
          identity: SCI_SYSTEM_IDENTITY,
          unified: {
            architecture: true,
            cockpit: true,
            ecl: true,
            dil: true,
            aiProposals: true,
            designSystem: true,
            diagnostics: true,
            reporting: true,
            intelligence: true,
          },
          docs: [
            "docs/enterprise/ecl-dil-architecture.md",
            "docs/enterprise/ecl-dil-api.md",
            "docs/enterprise/ecl-dil-risk-policy.md",
            "docs/enterprise/ecl-dil-ui.md",
            "docs/enterprise/ecl-dil-state.md",
            "docs/enterprise/desktop-launch.md",
          ],
          honesty: {
            ...ECL_DIL_HONESTY,
            holeless: false,
            humanUsabilityAlphaSlice: true,
            productionEligible: false,
            ready: false,
          },
          models: runtime.models,
          infra: {
            oidc: "ABSENT",
            otlp: "ABSENT",
            ledger: "in-memory",
            liveFeeds: runtime.feedStatus().liveAdapter,
            feedRegistry: runtime.feedStatus().registry,
            bookIntegrity: runtime.feedStatus().bookIntegrity,
            hooks: ENTERPRISE_HOOKS.hooks,
            prepared: ENTERPRISE_HOOKS.prepared,
            enabled: ENTERPRISE_HOOKS.enabled,
            note: "P2 placeholders prepared, enabled=false. Not ALPHA GO. Not READY.",
          },
          blueprints: BLUEPRINT_HOOKS,
          deployment: buildDeploymentInventory(),
          realisticSim: REALISTIC_SIM_HOOKS,
          professional: runtime.roleProfessional(),
        })
      );
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/deployment") {
      sendJson(res, 200, readEnvelope(buildDeploymentInventory()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/realistic-sim") {
      sendJson(res, 200, readEnvelope(runtime.realisticSimulation()));
      return true;
    }
    if (method === "GET" && path === "/v1/dil/realistic-sim") {
      sendJson(res, 200, readEnvelope(runtime.realisticSimulation()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/blueprints") {
      sendJson(
        res,
        200,
        readEnvelope({
          ...BLUEPRINT_HOOKS,
          liveAnalog: {
            proposals: runtime.proposals().length,
            auditEvents: runtime.audit().length,
            ledger: ECL_DIL_HONESTY.ledger,
            boot: SCI_SYSTEM_IDENTITY.boot,
            shell: SCI_SYSTEM_IDENTITY.shell,
            autoTrade: false,
            autoApply: false,
          },
        })
      );
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional") {
      sendJson(res, 200, readEnvelope(runtime.roleProfessional()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/blueprints") {
      sendJson(res, 200, readEnvelope(professionBlueprintCatalog()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/blueprint") {
      const roleId = url.searchParams.get("roleId") || "";
      const composed = composeProfessionBlueprint(roleId);
      if (!composed) {
        sendJson(res, 404, {
          error: "blueprint_not_found",
          roleId,
          label: ALPHA_LABEL,
          autoTrade: false,
          roles200Validated: false,
        });
        return true;
      }
      sendJson(res, 200, readEnvelope(ProfessionBlueprintSchema.parse(composed)));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/family-ux") {
      const familyId = url.searchParams.get("familyId") || "";
      const ux = composeFamilyUxV3(familyId);
      if (!ux) {
        sendJson(res, 404, {
          error: "family_ux_not_found",
          familyId,
          label: ALPHA_LABEL,
          autoTrade: false,
        });
        return true;
      }
      sendJson(res, 200, readEnvelope(FamilyUxV3Schema.parse(ux)));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/hero") {
      const roleId = url.searchParams.get("roleId") || "";
      const hero = composeHeroV3(roleId);
      if (!hero) {
        sendJson(res, 404, {
          error: "hero_not_found",
          roleId,
          label: ALPHA_LABEL,
          autoTrade: false,
          roles200Validated: false,
        });
        return true;
      }
      sendJson(res, 200, readEnvelope(HeroV3Schema.parse(hero)));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/master-box") {
      sendJson(res, 200, readEnvelope(masterExecutionBox()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/roles") {
      sendJson(res, 200, readEnvelope(runtime.roleProfessional()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/compile") {
      sendJson(res, 200, readEnvelope(runProfessionalWorkspaceCompilation()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/validate") {
      sendJson(res, 200, readEnvelope(runWorkspaceValidationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/validate/deep") {
      sendJson(res, 200, readEnvelope(runDeepWorkspaceValidationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/activate") {
      sendJson(res, 200, readEnvelope(runWorkspaceActivationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/stabilize") {
      sendJson(res, 200, readEnvelope(runWorkspaceStabilizationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/modules") {
      const professionId = url.searchParams.get("professionId") || undefined;
      sendJson(res, 200, readEnvelope(runtime.professionModules(professionId)));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/os-blueprints") {
      const blueprintId = url.searchParams.get("blueprintId") || undefined;
      sendJson(res, 200, readEnvelope(runtime.osBlueprints(blueprintId)));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/digital-activation") {
      sendJson(res, 200, readEnvelope(runDigitalActivationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/precision-upgrade") {
      sendJson(res, 200, readEnvelope(runPrecisionUpgradeWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/cyber-bridge") {
      sendJson(res, 200, readEnvelope(runCyberResearchBridgeWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/activation-review") {
      sendJson(res, 200, readEnvelope(runActivationReviewWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/enterprise-prep") {
      sendJson(res, 200, readEnvelope(runEnterprisePrepWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/automation-prep") {
      sendJson(res, 200, readEnvelope(runAutomationPrepWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/visibility-prep") {
      sendJson(res, 200, readEnvelope(runVisibilityPrepWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/visibility-activation") {
      sendJson(res, 200, readEnvelope(runVisibilityActivationWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/visibility-deep") {
      sendJson(res, 200, readEnvelope(runVisibilityDeepWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/explainability-prep") {
      sendJson(res, 200, readEnvelope(runExplainabilityPrepWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/explain-visibility") {
      sendJson(res, 200, readEnvelope(runExplainVisibilityWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/digital-workspace-compute") {
      sendJson(res, 200, readEnvelope(runDigitalWorkspaceComputeWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/activation-pass") {
      sendJson(res, 200, readEnvelope(runActivationPassWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/phase-core") {
      sendJson(res, 200, readEnvelope(runPhaseCoreWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/phase-core/blueprints") {
      sendJson(res, 200, readEnvelope(runPhaseCoreBlueprintsWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/audit-engine-core") {
      sendJson(res, 200, readEnvelope(runAuditEngineCoreWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/limit-engine-core") {
      sendJson(res, 200, readEnvelope(runLimitEngineCoreWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/ledger-core") {
      sendJson(res, 200, readEnvelope(runLedgerCoreWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/domain-fabric") {
      sendJson(res, 200, readEnvelope(runDomainFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/kg-fabric") {
      sendJson(res, 200, readEnvelope(runKgFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/scenario-fabric") {
      sendJson(res, 200, readEnvelope(runScenarioFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/causal-fabric") {
      sendJson(res, 200, readEnvelope(runCausalFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/governance-fabric") {
      sendJson(res, 200, readEnvelope(runGovernanceFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/infra-fabric") {
      sendJson(res, 200, readEnvelope(runInfraFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/security-fabric") {
      sendJson(res, 200, readEnvelope(runSecurityFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/os-fabric") {
      sendJson(res, 200, readEnvelope(runOsFabricWave()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/professional/cursor-runbook") {
      sendJson(res, 200, readEnvelope(runCursorRunbookWave()));
      return true;
    }

    if (method === "GET" && path === "/v1/dil/workspace") {
      sendJson(res, 200, readEnvelope(workspace(url)));
      return true;
    }
    if (method === "GET" && path === "/v1/dil/feeds") {
      sendJson(res, 200, readEnvelope(runtime.feedStatus()));
      return true;
    }
    if (method === "GET" && path === "/v1/ecl/feeds") {
      sendJson(res, 200, readEnvelope(runtime.feedStatus()));
      return true;
    }
    if (method === "GET" && path === "/v1/dil/calibration") {
      sendJson(res, 200, readEnvelope(runtime.calibration()));
      return true;
    }
    if (method === "GET" && path === "/v1/dil/track-record") {
      sendJson(res, 200, readEnvelope(runtime.trackRecord()));
      return true;
    }
    if (method === "POST" && path === "/v1/dil/resolve") {
      const body = (await readJson(req)) as { marketId?: string; outcome?: number; simulated?: boolean };
      if (!body.marketId) {
        sendJson(res, 400, { error: "marketId_required", label: ALPHA_LABEL });
        return true;
      }
      if (body.simulated !== true) {
        sendJson(res, 400, { error: "live_resolve_forbidden", label: ALPHA_LABEL, note: "Only simulated_alpha outcomes are accepted." });
        return true;
      }
      if (body.outcome !== 0 && body.outcome !== 1) {
        sendJson(res, 400, { error: "outcome_must_be_0_or_1", label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, envelope(runtime.resolveSimulated(body.marketId, body.outcome), { simulated: true }));
      return true;
    }
    if (method === "GET" && path === "/v1/dil/markets") {
      sendJson(res, 200, readEnvelope(runtime.markets()));
      return true;
    }
    if (method === "POST" && path === "/v1/dil/markets/refresh") {
      if (runtime.feedStatus().requested === "live_unverified") {
        const feeds = await runtime.applyLiveFeeds();
        sendJson(
          res,
          200,
          envelope(runtime.markets(), {
            feeds,
            persisted: false,
            bookMutated: true,
            instrumentSync: true,
            note: "In-memory only. UNVERIFIED. No audit write. No auto-trade.",
          })
        );
        return true;
      }
      sendJson(
        res,
        200,
        envelope(runtime.refreshSnapshots(), {
          feeds: runtime.feedStatus(),
          persisted: false,
          bookMutated: false,
        })
      );
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/markets/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/markets/".length));
      const m = runtime.market(id);
      if (!m) {
        sendJson(res, 404, { error: "unknown_market", marketId: id, label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, readEnvelope(m));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/probability/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/probability/".length));
      const p = runtime.probability(id);
      if (!p) {
        sendJson(res, 404, { error: "unknown_market", marketId: id, label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, readEnvelope(p));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/edge/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/edge/".length));
      const e = runtime.edge(id);
      if (!e) {
        sendJson(res, 404, { error: "unknown_market", marketId: id, label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, readEnvelope(e));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/risk/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/risk/".length));
      const r = runtime.dilRisk(id, horizonOf(url));
      if (!r) {
        sendJson(res, 404, { error: "unknown_market", marketId: id, label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, readEnvelope(r));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/scenario/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/scenario/".length));
      sendJson(res, 200, readEnvelope(runtime.previewScenario(id, horizonOf(url))));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/dil/decision/")) {
      const id = decodeURIComponent(path.slice("/v1/dil/decision/".length));
      sendJson(res, 200, readEnvelope(runtime.previewDecision(id, horizonOf(url))));
      return true;
    }
    if (method === "POST" && path === "/v1/dil/decision") {
      const body = (await readJson(req)) as { marketId?: string; horizon?: string };
      if (!body.marketId) {
        sendJson(res, 400, { error: "marketId_required", label: ALPHA_LABEL });
        return true;
      }
      const h = HorizonSchema.safeParse(body.horizon || "24h");
      sendJson(res, 200, envelope(runtime.decide(body.marketId, h.success ? h.data : "24h")));
      return true;
    }

    if (method === "GET" && path === "/v1/ai/proposals") {
      sendJson(
        res,
        200,
        readEnvelope(runtime.proposals(), { governance: "AGENT → PROPOSAL → HUMAN → DECISION" })
      );
      return true;
    }
    if (method === "POST" && path === "/v1/ai/proposals") {
      const body = (await readJson(req)) as { marketId?: string; horizon?: string };
      if (!body.marketId) {
        sendJson(res, 400, { error: "marketId_required", label: ALPHA_LABEL });
        return true;
      }
      const h = HorizonSchema.safeParse(body.horizon || "24h");
      sendJson(
        res,
        201,
        envelope(runtime.propose(body.marketId, h.success ? h.data : "24h"), {
          governance: "AGENT → PROPOSAL → HUMAN → DECISION",
          executable: false,
        })
      );
      return true;
    }
    if (method === "POST" && path.startsWith("/v1/ai/proposals/") && path.endsWith("/review")) {
      const id = decodeURIComponent(path.slice("/v1/ai/proposals/".length, path.length - "/review".length));
      const body = (await readJson(req)) as { decision?: string; note?: string };
      if (body.decision !== "accept" && body.decision !== "reject") {
        sendJson(res, 400, { error: "decision_must_be_accept_or_reject", label: ALPHA_LABEL });
        return true;
      }
      const reviewed = runtime.reviewProposal(id, body.decision, body.note);
      sendJson(res, 200, envelope(reviewed, { governance: "AGENT → PROPOSAL → HUMAN → DECISION", executable: false }));
      return true;
    }
    if (method === "GET" && path.startsWith("/v1/ai/proposals/")) {
      const id = decodeURIComponent(path.slice("/v1/ai/proposals/".length));
      if (id.endsWith("/review")) {
        sendJson(res, 404, { error: "not_found", path, label: ALPHA_LABEL });
        return true;
      }
      const p = runtime.proposal(id);
      if (!p) {
        sendJson(res, 404, { error: "unknown_proposal", proposalId: id, label: ALPHA_LABEL });
        return true;
      }
      sendJson(res, 200, readEnvelope(p));
      return true;
    }
    if (method === "GET" && path === "/v1/ai/signals") {
      sendJson(res, 200, readEnvelope(runtime.signals()));
      return true;
    }
    if (method === "POST" && path === "/v1/ai/signals") {
      const body = (await readJson(req)) as {
        kind?: string;
        text?: string;
        marketId?: string;
        weight?: number;
        sourceStatus?: "STUB" | "MANUAL" | "UNVERIFIED";
      };
      if (!body.text || !body.kind) {
        sendJson(res, 400, { error: "kind_and_text_required", label: ALPHA_LABEL });
        return true;
      }
      sendJson(
        res,
        201,
        envelope(
          runtime.addSignal({
            kind: body.kind as "news" | "social" | "onchain" | "macro" | "manual",
            text: body.text,
            marketId: body.marketId,
            weight: body.weight ?? 0.2,
            sourceStatus: body.sourceStatus ?? "MANUAL",
          })
        )
      );
      return true;
    }

    sendJson(res, 404, { error: "not_found", path, label: ALPHA_LABEL });
    metrics.timing("ecl_dil.request_ms", Date.now() - t0);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("ecl_dil_error", { path, detail: msg });
    metrics.inc("ecl_dil.errors");
    if (msg.startsWith("unknown_market:") || msg.startsWith("unknown_pending:")) {
      sendJson(res, 404, { error: "unknown_market", detail: msg, label: ALPHA_LABEL });
      return true;
    }
    if (msg.startsWith("unknown_proposal:")) {
      sendJson(res, 404, { error: "unknown_proposal", detail: msg, label: ALPHA_LABEL });
      return true;
    }
    if (msg.startsWith("already_reviewed:")) {
      sendJson(res, 409, { error: "already_reviewed", detail: msg, label: ALPHA_LABEL, autoTrade: false });
      return true;
    }
    sendJson(res, 500, { error: "ecl_dil_internal", detail: msg, label: ALPHA_LABEL });
    return true;
  }
}

export function getEclDilRuntime() {
  return runtime;
}
