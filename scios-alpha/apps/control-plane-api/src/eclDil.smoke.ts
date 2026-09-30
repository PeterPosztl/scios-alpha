/**
 * In-process ECL/DIL HTTP smoke. No second OS.
 * ALPHA_NON_PRODUCTION
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { eclDilRouter } from "./routes/eclDil.js";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  void eclDilRouter({
    method: req.method || "GET",
    path: url.pathname,
    url,
    req,
    res,
    sendJson,
    readJson,
  }).then((hit) => {
    if (!hit) sendJson(res, 404, { error: "not_ecl_dil" });
  });
});

type SmokeGet = (p: string) => Promise<Record<string, unknown>>;

/**
 * Professional-fabric refusal checks.
 *
 * Kept as a separate function so neither body exceeds the TypeScript
 * control-flow analysis limit (TS2563); exceeding it silently disables
 * contextual typing for every nested callback in the same body.
 */
async function professionalFabricChecks(
  get: SmokeGet,
  fails: string[],
  base: string,
  markets: { data?: Array<{ marketId: string }> },
  auditBeforeDigital: { data?: unknown[] }
) {
  const domainFabric = (await get("/v1/ecl/professional/domain-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      liveDomainData?: boolean;
      parallelTree?: boolean;
      health?: { liveDesks?: number; ingestedWithoutFetch?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (domainFabric.persisted !== false) fails.push("domain-fabric persisted not false");
  if (domainFabric.autoTrade !== false) fails.push("domain-fabric autoTrade");
  if (domainFabric.data?.wave !== "REFUSED") fails.push("domain-fabric wave");
  if (domainFabric.data?.ready === true) fails.push("domain-fabric READY");
  if (domainFabric.data?.liveDomainData !== false) fails.push("domain-fabric liveDomainData");
  if (domainFabric.data?.parallelTree !== false) fails.push("domain-fabric parallelTree");
  if (domainFabric.data?.health?.liveDesks !== 0) fails.push("domain-fabric liveDesks");
  if (domainFabric.data?.health?.ingestedWithoutFetch !== 0) fails.push("domain-fabric ingestedWithoutFetch");
  if (domainFabric.data?.health?.megaFiles !== 0) fails.push("domain-fabric megaFiles");
  if (domainFabric.data?.health?.fail !== 0) fails.push("domain-fabric fail");
  if (domainFabric.data?.path?.find((c) => c.id === "DF.path")?.result !== "REFUSED") {
    fails.push("domain-fabric src/domain-fabric.ts");
  }
  if (domainFabric.data?.boot?.find((c) => c.id === "DF8.sevenDomainsLive")?.result !== "REFUSED") {
    fails.push("domain-fabric 7-domain ctor");
  }
  const kgFabric = (await get("/v1/ecl/professional/kg-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      nationalGraph?: boolean;
      causalQueryEngine?: string;
      parallelTree?: boolean;
      health?: { nationalGraphStamps?: number; ingestedWithoutFetch?: number; causalEngines?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (kgFabric.persisted !== false) fails.push("kg-fabric persisted not false");
  if (kgFabric.autoTrade !== false) fails.push("kg-fabric autoTrade");
  if (kgFabric.data?.wave !== "REFUSED") fails.push("kg-fabric wave");
  if (kgFabric.data?.ready === true) fails.push("kg-fabric READY");
  if (kgFabric.data?.nationalGraph !== false) fails.push("kg-fabric nationalGraph");
  if (kgFabric.data?.causalQueryEngine !== "ABSENT") fails.push("kg-fabric causalQueryEngine");
  if (kgFabric.data?.parallelTree !== false) fails.push("kg-fabric parallelTree");
  if (kgFabric.data?.health?.nationalGraphStamps !== 0) fails.push("kg-fabric nationalGraphStamps");
  if (kgFabric.data?.health?.ingestedWithoutFetch !== 0) fails.push("kg-fabric ingestedWithoutFetch");
  if (kgFabric.data?.health?.causalEngines !== 0) fails.push("kg-fabric causalEngines");
  if (kgFabric.data?.health?.megaFiles !== 0) fails.push("kg-fabric megaFiles");
  if (kgFabric.data?.health?.fail !== 0) fails.push("kg-fabric fail");
  if (kgFabric.data?.path?.find((c) => c.id === "KG.path")?.result !== "REFUSED") {
    fails.push("kg-fabric src/kg-fabric.ts");
  }
  if (kgFabric.data?.boot?.find((c) => c.id === "KG7.postgresCtor")?.result !== "REFUSED") {
    fails.push("kg-fabric postgres ctor");
  }
  if (kgFabric.data?.boot?.find((c) => c.id === "KG7.monteCarloRandom")?.result !== "REFUSED") {
    fails.push("kg-fabric monteCarlo");
  }
  const scenarioFabric = (await get("/v1/ecl/professional/scenario-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      executed?: boolean;
      parallelTree?: boolean;
      health?: { executedRuns?: number; parallelBatches?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      runner?: Array<{ id?: string; result?: string }>;
      domainCausal?: Array<{ id?: string; result?: string }>;
    };
  };
  if (scenarioFabric.persisted !== false) fails.push("scenario-fabric persisted not false");
  if (scenarioFabric.autoTrade !== false) fails.push("scenario-fabric autoTrade");
  if (scenarioFabric.data?.wave !== "REFUSED") fails.push("scenario-fabric wave");
  if (scenarioFabric.data?.ready === true) fails.push("scenario-fabric READY");
  if (scenarioFabric.data?.executed !== false) fails.push("scenario-fabric executed");
  if (scenarioFabric.data?.parallelTree !== false) fails.push("scenario-fabric parallelTree");
  if (scenarioFabric.data?.health?.executedRuns !== 0) fails.push("scenario-fabric executedRuns");
  if (scenarioFabric.data?.health?.parallelBatches !== 0) fails.push("scenario-fabric parallelBatches");
  if (scenarioFabric.data?.health?.megaFiles !== 0) fails.push("scenario-fabric megaFiles");
  if (scenarioFabric.data?.health?.fail !== 0) fails.push("scenario-fabric fail");
  if (scenarioFabric.data?.path?.find((c) => c.id === "SF.path")?.result !== "REFUSED") {
    fails.push("scenario-fabric src/scenario-fabric.ts");
  }
  if (scenarioFabric.data?.runner?.find((c) => c.id === "SF401_600.coreRun")?.result !== "REFUSED") {
    fails.push("scenario-fabric core.run");
  }
  if (scenarioFabric.data?.domainCausal?.find((c) => c.id === "SF801_1000.causalMonteCarlo")?.result !== "REFUSED") {
    fails.push("scenario-fabric monteCarlo");
  }
  const causalFabric = (await get("/v1/ecl/professional/causal-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoDecide?: boolean;
      causalQueryEngine?: string;
      parallelTree?: boolean;
      health?: { causalEngines?: number; autoApprovals?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (causalFabric.persisted !== false) fails.push("causal-fabric persisted not false");
  if (causalFabric.autoTrade !== false) fails.push("causal-fabric autoTrade");
  if (causalFabric.data?.wave !== "REFUSED") fails.push("causal-fabric wave");
  if (causalFabric.data?.ready === true) fails.push("causal-fabric READY");
  if (causalFabric.data?.autoDecide !== false) fails.push("causal-fabric autoDecide");
  if (causalFabric.data?.causalQueryEngine !== "ABSENT") fails.push("causal-fabric causalQueryEngine");
  if (causalFabric.data?.parallelTree !== false) fails.push("causal-fabric parallelTree");
  if (causalFabric.data?.health?.causalEngines !== 0) fails.push("causal-fabric causalEngines");
  if (causalFabric.data?.health?.autoApprovals !== 0) fails.push("causal-fabric autoApprovals");
  if (causalFabric.data?.health?.megaFiles !== 0) fails.push("causal-fabric megaFiles");
  if (causalFabric.data?.health?.fail !== 0) fails.push("causal-fabric fail");
  if (causalFabric.data?.path?.find((c) => c.id === "CF.path")?.result !== "REFUSED") {
    fails.push("causal-fabric src/causal-fabric.ts");
  }
  if (causalFabric.data?.boot?.find((c) => c.id === "CF7.ateEmptyZero")?.result !== "REFUSED") {
    fails.push("causal-fabric ATE empty 0");
  }
  if (causalFabric.data?.boot?.find((c) => c.id === "CF7.enforceBlock")?.result !== "REFUSED") {
    fails.push("causal-fabric enforce block");
  }
  const govFabric = (await get("/v1/ecl/professional/governance-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoDecide?: boolean;
      parallelTree?: boolean;
      health?: { autoApprovals?: number; liveDesks?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      hitl?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (govFabric.persisted !== false) fails.push("governance-fabric persisted not false");
  if (govFabric.autoTrade !== false) fails.push("governance-fabric autoTrade");
  if (govFabric.data?.wave !== "REFUSED") fails.push("governance-fabric wave");
  if (govFabric.data?.ready === true) fails.push("governance-fabric READY");
  if (govFabric.data?.autoDecide !== false) fails.push("governance-fabric autoDecide");
  if (govFabric.data?.parallelTree !== false) fails.push("governance-fabric parallelTree");
  if (govFabric.data?.health?.autoApprovals !== 0) fails.push("governance-fabric autoApprovals");
  if (govFabric.data?.health?.liveDesks !== 0) fails.push("governance-fabric liveDesks");
  if (govFabric.data?.health?.megaFiles !== 0) fails.push("governance-fabric megaFiles");
  if (govFabric.data?.health?.fail !== 0) fails.push("governance-fabric fail");
  if (govFabric.data?.path?.find((c) => c.id === "GF.path")?.result !== "REFUSED") {
    fails.push("governance-fabric src/governance-fabric.ts");
  }
  if (govFabric.data?.hitl?.find((c) => c.id === "GF201_400.hitlLoop")?.result !== "REFUSED") {
    fails.push("governance-fabric HITL auto");
  }
  if (govFabric.data?.boot?.find((c) => c.id === "GF7.functionEval")?.result !== "REFUSED") {
    fails.push("governance-fabric Function eval");
  }
  if (govFabric.data?.boot?.find((c) => c.id === "GF7.autoApproveFreeze")?.result !== "REFUSED") {
    fails.push("governance-fabric auto freeze");
  }
  const infraFabric = (await get("/v1/ecl/professional/infra-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoDecide?: boolean;
      autoRecovery?: boolean;
      daemonInBoot?: boolean;
      parallelTree?: boolean;
      health?: { autoRecoveries?: number; daemonInBoot?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      engine?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (infraFabric.persisted !== false) fails.push("infra-fabric persisted not false");
  if (infraFabric.autoTrade !== false) fails.push("infra-fabric autoTrade");
  if (infraFabric.data?.wave !== "REFUSED") fails.push("infra-fabric wave");
  if (infraFabric.data?.ready === true) fails.push("infra-fabric READY");
  if (infraFabric.data?.autoDecide !== false) fails.push("infra-fabric autoDecide");
  if (infraFabric.data?.autoRecovery !== false) fails.push("infra-fabric autoRecovery");
  if (infraFabric.data?.daemonInBoot !== false) fails.push("infra-fabric daemonInBoot");
  if (infraFabric.data?.parallelTree !== false) fails.push("infra-fabric parallelTree");
  if (infraFabric.data?.health?.autoRecoveries !== 0) fails.push("infra-fabric autoRecoveries");
  if (infraFabric.data?.health?.daemonInBoot !== 0) fails.push("infra-fabric health daemonInBoot");
  if (infraFabric.data?.health?.megaFiles !== 0) fails.push("infra-fabric megaFiles");
  if (infraFabric.data?.health?.fail !== 0) fails.push("infra-fabric fail");
  if (infraFabric.data?.path?.find((c) => c.id === "IF.path")?.result !== "REFUSED") {
    fails.push("infra-fabric src/infra-fabric.ts");
  }
  if (infraFabric.data?.engine?.find((c) => c.id === "IF1_200.probeAlwaysUp")?.result !== "REFUSED") {
    fails.push("infra-fabric probe always up");
  }
  if (infraFabric.data?.boot?.find((c) => c.id === "IF7.recoverPostgres")?.result !== "REFUSED") {
    fails.push("infra-fabric auto recover");
  }
  if (infraFabric.data?.boot?.find((c) => c.id === "IF7.postgresReadyTrue")?.result !== "REFUSED") {
    fails.push("infra-fabric READY stamp");
  }
  if (infraFabric.data?.boot?.find((c) => c.id === "IF7.alwaysTrueCtor")?.result !== "REFUSED") {
    fails.push("infra-fabric always-true recovery");
  }
  const secFabric = (await get("/v1/ecl/professional/security-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoDecide?: boolean;
      parallelTree?: boolean;
      health?: { autoApprovals?: number; liveDesks?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      sandbox?: Array<{ id?: string; result?: string }>;
      domainGov?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (secFabric.persisted !== false) fails.push("security-fabric persisted not false");
  if (secFabric.autoTrade !== false) fails.push("security-fabric autoTrade");
  if (secFabric.data?.wave !== "REFUSED") fails.push("security-fabric wave");
  if (secFabric.data?.ready === true) fails.push("security-fabric READY");
  if (secFabric.data?.autoDecide !== false) fails.push("security-fabric autoDecide");
  if (secFabric.data?.parallelTree !== false) fails.push("security-fabric parallelTree");
  if (secFabric.data?.health?.autoApprovals !== 0) fails.push("security-fabric autoApprovals");
  if (secFabric.data?.health?.liveDesks !== 0) fails.push("security-fabric liveDesks");
  if (secFabric.data?.health?.megaFiles !== 0) fails.push("security-fabric megaFiles");
  if (secFabric.data?.health?.fail !== 0) fails.push("security-fabric fail");
  if (secFabric.data?.path?.find((c) => c.id === "XF.path")?.result !== "REFUSED") {
    fails.push("security-fabric src/security-fabric.ts");
  }
  if (secFabric.data?.path?.find((c) => c.id === "XF.envFile")?.result !== "REFUSED") {
    fails.push("security-fabric .env secret");
  }
  if (secFabric.data?.sandbox?.find((c) => c.id === "XF1_200.functionEval")?.result !== "REFUSED") {
    fails.push("security-fabric Function eval");
  }
  if (secFabric.data?.domainGov?.find((c) => c.id === "XF801_1000.autoApprove")?.result !== "REFUSED") {
    fails.push("security-fabric auto-approve");
  }
  if (secFabric.data?.boot?.find((c) => c.id === "XF7.govEnforce")?.result !== "REFUSED") {
    fails.push("security-fabric enforce");
  }
  if (secFabric.data?.boot?.find((c) => c.id === "XF7.missingCheckerPass")?.result !== "REFUSED") {
    fails.push("security-fabric missing checker PASS");
  }
  if (secFabric.data?.boot?.find((c) => c.id === "XF7.adminAllWrite")?.result !== "REFUSED") {
    fails.push("security-fabric admin-all allow");
  }
  const osFabric = (await get("/v1/ecl/professional/os-fabric")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoDecide?: boolean;
      daemonInBoot?: boolean;
      parallelTree?: boolean;
      health?: { daemonInBoot?: number; electronHosts?: number; liveDesks?: number; megaFiles?: number; fail?: number };
      path?: Array<{ id?: string; result?: string }>;
      daemon?: Array<{ id?: string; result?: string }>;
      desktop?: Array<{ id?: string; result?: string }>;
      boot?: Array<{ id?: string; result?: string }>;
    };
  };
  if (osFabric.persisted !== false) fails.push("os-fabric persisted not false");
  if (osFabric.autoTrade !== false) fails.push("os-fabric autoTrade");
  if (osFabric.data?.wave !== "REFUSED") fails.push("os-fabric wave");
  if (osFabric.data?.ready === true) fails.push("os-fabric READY");
  if (osFabric.data?.autoDecide !== false) fails.push("os-fabric autoDecide");
  if (osFabric.data?.daemonInBoot !== false) fails.push("os-fabric daemonInBoot");
  if (osFabric.data?.parallelTree !== false) fails.push("os-fabric parallelTree");
  if (osFabric.data?.health?.daemonInBoot !== 0) fails.push("os-fabric health daemonInBoot");
  if (osFabric.data?.health?.electronHosts !== 0) fails.push("os-fabric electronHosts");
  if (osFabric.data?.health?.liveDesks !== 0) fails.push("os-fabric liveDesks");
  if (osFabric.data?.health?.megaFiles !== 0) fails.push("os-fabric megaFiles");
  if (osFabric.data?.health?.fail !== 0) fails.push("os-fabric fail");
  if (osFabric.data?.path?.find((c) => c.id === "OF.path")?.result !== "REFUSED") {
    fails.push("os-fabric src/os-fabric.ts");
  }
  if (osFabric.data?.path?.find((c) => c.id === "OF.npmInstall")?.result !== "REFUSED") {
    fails.push("os-fabric npm install");
  }
  if (osFabric.data?.daemon?.find((c) => c.id === "OF1_300.startRunning")?.result !== "REFUSED") {
    fails.push("os-fabric daemon start");
  }
  if (osFabric.data?.desktop?.find((c) => c.id === "OF301_600.electron")?.result !== "REFUSED") {
    fails.push("os-fabric Electron");
  }
  if (osFabric.data?.boot?.find((c) => c.id === "OF7.startDaemon")?.result !== "REFUSED") {
    fails.push("os-fabric startDaemon");
  }
  if (osFabric.data?.boot?.find((c) => c.id === "OF7.lrgReadyDemo")?.result !== "REFUSED") {
    fails.push("os-fabric lrgReady demo");
  }
  const runbook = (await get("/v1/ecl/professional/cursor-runbook")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      execution?: boolean;
      durable?: boolean;
      daemonInBoot?: boolean;
      health?: {
        npmLockfiles?: number;
        scriptsInvented?: number;
        daemonStarted?: number;
        fail?: number;
        filesInvented?: number;
        secondOsApps?: number;
      };
      steps?: Array<{ id?: string; result?: string }>;
      flags?: Array<{ id?: string; result?: string }>;
      files?: Array<{ id?: string; result?: string }>;
      realistic?: Array<{ id?: string; result?: string }>;
    };
  };
  if (runbook.persisted !== false) fails.push("cursor-runbook persisted not false");
  if (runbook.autoTrade !== false) fails.push("cursor-runbook autoTrade");
  if (runbook.data?.wave !== "REFUSED") fails.push("cursor-runbook wave");
  if (runbook.data?.ready === true) fails.push("cursor-runbook READY");
  if (runbook.data?.execution !== false) fails.push("cursor-runbook execution");
  if (runbook.data?.durable !== false) fails.push("cursor-runbook durable");
  if (runbook.data?.daemonInBoot !== false) fails.push("cursor-runbook daemonInBoot");
  if (runbook.data?.health?.npmLockfiles !== 0) fails.push("cursor-runbook npmLockfiles");
  if (runbook.data?.health?.scriptsInvented !== 0) fails.push("cursor-runbook scriptsInvented");
  if (runbook.data?.health?.daemonStarted !== 0) fails.push("cursor-runbook daemonStarted");
  if (runbook.data?.health?.fail !== 0) fails.push("cursor-runbook fail");
  if (runbook.data?.steps?.find((c) => c.id === "RB.1.npmInstall")?.result !== "REFUSED") {
    fails.push("cursor-runbook npm install");
  }
  if (runbook.data?.steps?.find((c) => c.id === "RB.8.runAllDemo")?.result !== "REFUSED") {
    fails.push("cursor-runbook run-all demo");
  }
  if (runbook.data?.flags?.find((c) => c.id === "RB.flag.daemon")?.result !== "ANALOG_CONTRACT") {
    fails.push("cursor-runbook daemon flag");
  }
  if (runbook.data?.health?.filesInvented !== 0) fails.push("cursor-runbook filesInvented");
  if (runbook.data?.health?.secondOsApps !== 0) fails.push("cursor-runbook secondOsApps");
  if (runbook.data?.files?.find((c) => c.id === "BO.25.daemonApp")?.result !== "REFUSED") {
    fails.push("cursor-runbook daemon app");
  }
  if (runbook.data?.files?.find((c) => c.id === "BO.26.electron")?.result !== "REFUSED") {
    fails.push("cursor-runbook Electron app");
  }
  if (runbook.data?.files?.find((c) => c.id === "BO.29.runAll")?.result !== "REFUSED") {
    fails.push("cursor-runbook run-all.ts");
  }
  if (runbook.data?.realistic?.length !== 10) fails.push("cursor-runbook realistic count");
  if (runbook.data?.realistic?.find((c) => c.id === "RR.2.smoke")?.result !== "ANALOG_CONTRACT") {
    fails.push("cursor-runbook realistic smoke");
  }
  if (runbook.data?.realistic?.find((c) => c.id === "RR.10.flags")?.result !== "ANALOG_CONTRACT") {
    fails.push("cursor-runbook realistic flags");
  }
  const evAfter = (await get("/v1/ecl/professional/explain-visibility")) as { data?: { wave?: string; passGranted?: boolean } };
  if (evAfter.data?.wave !== "REFUSED") fails.push("explain-visibility flipped after master suite");
  if (evAfter.data?.passGranted !== false) fails.push("explain-visibility passGranted after master suite");
  const auditAfterDigital = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterDigital.data?.length || 0) !== (auditBeforeDigital.data?.length || 0)) {
    fails.push("digital/precision GET mutated audit");
  }
  const trBefore = (await get("/v1/dil/track-record")) as { data?: unknown[] };
  const ws = (await get("/v1/dil/workspace?horizon=24h")) as {
    persisted?: boolean;
    data?: {
      rows?: Array<{ scenario?: { autoTrade?: boolean }; rowStatus?: string }>;
      feeds?: { actual?: string; liveAdapter?: string; autoTrade?: boolean };
      trackRecord?: unknown[];
    };
  };
  if (ws.persisted !== false) fails.push("workspace GET persisted not false");
  if (ws.data?.rows?.[0]?.scenario?.autoTrade !== false) fails.push("workspace scenario autoTrade not false");
  if (ws.data?.rows?.some((r) => r.rowStatus && r.rowStatus !== "ok" && r.rowStatus !== "UNKNOWN")) {
    fails.push("workspace rowStatus invalid");
  }
  if (ws.data?.feeds?.actual !== "simulated_alpha") fails.push("workspace feeds.actual not simulated_alpha");
  if (ws.data?.feeds?.autoTrade !== false) fails.push("workspace feeds autoTrade not false");
  if (!Array.isArray(ws.data?.trackRecord)) fails.push("workspace missing trackRecord array");
  if (process.env.SCI_DIL_FEED !== "live_unverified" && ws.data?.feeds?.liveAdapter !== "ABSENT") {
    fails.push("live adapter not ABSENT on default");
  }
  const trAfterWs = (await get("/v1/dil/track-record")) as { data?: unknown[] };
  if ((trAfterWs.data?.length || 0) !== (trBefore.data?.length || 0)) {
    fails.push("workspace GET mutated track-record");
  }
  const feedSt = (await get("/v1/dil/feeds")) as {
    data?: {
      liveAdapter?: string;
      bookIntegrity?: { orphanMarkets?: number; durable?: boolean };
      registry?: {
        feeds?: unknown[];
        health?: { registered?: number; liveCertified?: number };
        enabledLive?: boolean;
        autoTrade?: boolean;
        persisted?: boolean;
      };
    };
    persisted?: boolean;
  };
  if (feedSt.persisted !== false) fails.push("feeds GET persisted not false");
  if (feedSt.data?.bookIntegrity?.orphanMarkets !== 0) fails.push("bookIntegrity orphanMarkets not 0");
  if (feedSt.data?.bookIntegrity?.durable !== false) fails.push("bookIntegrity claimed durable");
  const reg = feedSt.data?.registry as
    | {
        feeds?: Array<{ id?: string; mode?: string; live?: string }>;
        health?: { registered?: number; liveCertified?: number };
        enabledLive?: boolean;
        autoTrade?: boolean;
        persisted?: boolean;
        unexpectedLive?: boolean;
        simulationOnly?: boolean;
      }
    | undefined;
  if (!Array.isArray(reg?.feeds) || reg.feeds.length !== 13) fails.push("feed registry missing 13 types");
  if (reg?.health?.liveCertified !== 0) fails.push("feed registry claimed live certified");
  if (reg?.enabledLive !== false) fails.push("feed registry enabledLive");
  if (reg?.autoTrade !== false) fails.push("feed registry autoTrade");
  if (reg?.persisted !== false) fails.push("feed registry persisted");
  if (reg?.unexpectedLive === true) fails.push("feed registry unexpected live");
  if (reg?.simulationOnly !== true) fails.push("feed registry not simulationOnly");
  if (!reg?.feeds?.some((f) => f.id === "prediction.kalshi")) fails.push("feed registry missing prediction.kalshi");
  if (!reg?.feeds?.some((f) => f.id === "prediction.polymarket")) fails.push("feed registry missing prediction.polymarket");
  if (reg?.feeds?.some((f) => f.mode && f.mode !== "SIMULATION_ONLY")) fails.push("feed mode not SIMULATION_ONLY");
  if (reg?.feeds?.some((f) => f.live && f.live !== "ABSENT")) fails.push("unexpected live feed on default");
  const eclFeeds = (await get("/v1/ecl/feeds")) as { persisted?: boolean; autoTrade?: boolean };
  if (eclFeeds.persisted !== false) fails.push("ecl feeds persisted not false");
  if (eclFeeds.autoTrade !== false) fails.push("ecl feeds autoTrade not false");
  const arch = (await get("/v1/ecl/architecture")) as {
    persisted?: boolean;
    data?: {
      identity?: { ready?: boolean; secondShell?: boolean; identity?: string };
      honesty?: { ready?: boolean };
      infra?: { oidc?: string; otlp?: string; ledger?: string; feedRegistry?: { health?: { registered?: number; liveCertified?: number } } };
      feeds?: { registry?: { health?: { registered?: number; liveCertified?: number }; enabledLive?: boolean } };
    };
  };
  if (arch.persisted !== false) fails.push("architecture GET persisted not false");
  if (arch.data?.identity?.ready === true) fails.push("architecture identity claimed READY");
  if (arch.data?.identity?.secondShell === true) fails.push("architecture claimed second shell");
  if (arch.data?.identity?.identity !== "ENTERPRISE_GRADE_ALPHA") fails.push("architecture identity missing");
  if (arch.data?.honesty?.ready === true) fails.push("honesty claimed READY");
  if (arch.data?.infra?.oidc !== "ABSENT") fails.push("infra oidc not ABSENT");
  if (arch.data?.infra?.otlp !== "ABSENT") fails.push("infra otlp not ABSENT");
  if (arch.data?.infra?.ledger !== "in-memory") fails.push("infra ledger not in-memory");
  if (arch.data?.feeds?.registry?.health?.registered !== 13) fails.push("architecture feed registry not 13");
  if (arch.data?.feeds?.registry?.health?.liveCertified !== 0) fails.push("architecture claimed live certified feeds");
  if (arch.data?.feeds?.registry?.enabledLive !== false) fails.push("architecture enabledLive feeds");
  const first = markets.data?.[0]?.marketId;
  const propRes = await fetch(base + "/v1/ai/proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId: first, horizon: "24h" }),
  });
  const prop = (await propRes.json()) as {
    data?: {
      autoExecute?: boolean;
      requiresHuman?: boolean;
      action?: string;
      proposalId?: string;
      uncertainty?: { guessMode?: boolean };
    };
  };
  if (prop.data?.autoExecute !== false || prop.data?.requiresHuman !== true) {
    fails.push("proposal executable or not requiring human");
  }
  if (prop.data?.uncertainty?.guessMode !== true) {
    fails.push("proposal uncertainty not visible");
  }
  if (prop.data?.proposalId) {
    const tradesBefore = (await get("/v1/ecl/trades")) as { data?: unknown[]; persisted?: boolean };
    if (tradesBefore.persisted !== false) fails.push("trades GET persisted not false");
    const tradeN = Array.isArray(tradesBefore.data) ? tradesBefore.data.length : 0;
    const auditBefore = (await get("/v1/ecl/audit")) as { data?: unknown[] };
    const revRes = await fetch(base + "/v1/ai/proposals/" + encodeURIComponent(prop.data.proposalId) + "/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "reject", note: "smoke human close" }),
    });
    const rev = (await revRes.json()) as {
      autoTrade?: boolean;
      data?: { autoTrade?: boolean; executed?: boolean; proposal?: { humanReview?: { decision?: string } } };
    };
    if (revRes.status !== 200) fails.push("proposal review HTTP " + revRes.status);
    if (rev.autoTrade !== false || rev.data?.executed !== false || rev.data?.autoTrade !== false) {
      fails.push("proposal review must not trade");
    }
    if (rev.data?.proposal?.humanReview?.decision !== "reject") fails.push("humanReview not reject");
    const tradesAfter = (await get("/v1/ecl/trades")) as { data?: unknown[] };
    if ((Array.isArray(tradesAfter.data) ? tradesAfter.data.length : 0) !== tradeN) {
      fails.push("proposal review mutated trades");
    }
    const auditAfterReview = (await get("/v1/ecl/audit")) as { data?: unknown[] };
    if ((auditAfterReview.data?.length || 0) <= (auditBefore.data?.length || 0)) {
      fails.push("proposal review did not write audit");
    }
    const dup = await fetch(base + "/v1/ai/proposals/" + encodeURIComponent(prop.data.proposalId) + "/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "accept" }),
    });
    if (dup.status !== 409) fails.push("duplicate review must 409");
  }
  if (first) {
    const auditBefore = (await get("/v1/ecl/audit")) as { data?: unknown[] };
    const scRes = await get("/v1/dil/scenario/" + encodeURIComponent(first) + "?horizon=24h");
    const sc = scRes as { persisted?: boolean; data?: { autoTrade?: boolean } };
    if (sc.persisted !== false) fails.push("scenario GET persisted not false");
    if (sc.data?.autoTrade !== false) fails.push("scenario autoTrade not false");
    const auditAfter = (await get("/v1/ecl/audit")) as { data?: unknown[] };
    if ((auditAfter.data?.length || 0) !== (auditBefore.data?.length || 0)) {
      fails.push("scenario GET mutated audit");
    }
    const dec = (await get("/v1/dil/decision/" + encodeURIComponent(first))) as { persisted?: boolean };
    if (dec.persisted !== false) fails.push("decision GET persisted not false");
  }
  const cal = (await get("/v1/dil/calibration")) as {
    persisted?: boolean;
    data?: {
      liveCalibration?: string;
      probabilityCalibratedLive?: boolean;
      status?: string;
      simulated?: { adequate?: boolean };
      productionEligible?: boolean;
    };
  };
  if (cal.persisted !== false) fails.push("calibration GET persisted not false");
  if (cal.data?.liveCalibration !== "UNKNOWN") fails.push("live calibration not UNKNOWN");
  if (cal.data?.probabilityCalibratedLive !== false) fails.push("live probability claimed calibrated");
  if (cal.data?.status !== "ADEQUATE_ALPHA") fails.push("simulated calibration not ADEQUATE_ALPHA");
  if (cal.data?.simulated?.adequate !== true) fails.push("simulated.adequate not true");
  if (cal.data?.productionEligible !== false) fails.push("calibration productionEligible not false");
  const tradesBeforeEval = (await get("/v1/ecl/trades")) as { data?: unknown[] };
  const tradeNEval = Array.isArray(tradesBeforeEval.data) ? tradesBeforeEval.data.length : 0;
  const missingRisk = await fetch(base + "/v1/ecl/engine/audit-eval", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "smoke-user",
      instrumentId: "inst-pm-fed-cut-oct",
      action: "BUY",
      size: 100,
    }),
  });
  const missingBody = (await missingRisk.json()) as {
    autoTrade?: boolean;
    executable?: boolean;
    persisted?: boolean;
    data?: { allowed?: boolean; executed?: boolean; ready?: boolean; autoAudit?: boolean; verdicts?: { rule?: string; status?: string }[] };
  };
  if (missingRisk.status !== 200) fails.push("audit-eval missing risk HTTP " + missingRisk.status);
  if (missingBody.autoTrade !== false || missingBody.executable !== false) fails.push("audit-eval must not be executable");
  if (missingBody.persisted !== false) fails.push("audit-eval persisted not false");
  if (missingBody.data?.allowed !== false) fails.push("audit-eval missing riskScore must not allow");
  if (missingBody.data?.executed !== false) fails.push("audit-eval executed");
  if (missingBody.data?.ready === true) fails.push("audit-eval claimed READY");
  if (missingBody.data?.autoAudit !== false) fails.push("audit-eval enabled autoAudit");
  if (missingBody.data?.verdicts?.find((v) => v.rule === "maxRiskScore")?.status !== "UNKNOWN") {
    fails.push("audit-eval missing riskScore not UNKNOWN");
  }
  const okEval = await fetch(base + "/v1/ecl/engine/audit-eval", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "smoke-user",
      instrumentId: "inst-pm-fed-cut-oct",
      action: "BUY",
      size: 100,
      riskScore: 0.4,
    }),
  });
  const okBody = (await okEval.json()) as { data?: { allowed?: boolean; executed?: boolean; engine?: string } };
  if (okEval.status !== 200) fails.push("audit-eval ok HTTP " + okEval.status);
  if (okBody.data?.allowed !== true) fails.push("audit-eval analog PASS_CONSTRAINT not allowed");
  if (okBody.data?.executed !== false) fails.push("audit-eval ok executed");
  if (okBody.data?.engine !== "audit-engine-v1") fails.push("audit-eval engine stamp");
  const tradesAfterEval = (await get("/v1/ecl/trades")) as { data?: unknown[] };
  if ((Array.isArray(tradesAfterEval.data) ? tradesAfterEval.data.length : 0) !== tradeNEval) {
    fails.push("audit-eval mutated trades");
  }
  const autoPrepAfter = (await get("/v1/ecl/professional/automation-prep")) as {
    data?: { autoAudit?: boolean; autoLimits?: boolean };
  };
  if (autoPrepAfter.data?.autoAudit !== false || autoPrepAfter.data?.autoLimits !== false) {
    fails.push("audit-eval flipped continuous auto engines");
  }
  const p1 = await fetch(base + "/v1/ecl/engine/prediction", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instrumentId: "inst-pm-fed-cut-oct", horizonDays: 1 }),
  });
  const p2 = await fetch(base + "/v1/ecl/engine/prediction", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instrumentId: "inst-pm-fed-cut-oct", horizonDays: 1 }),
  });
  const pred1 = (await p1.json()) as { data?: { expectedReturn?: number; calibratedLive?: boolean } };
  const pred2 = (await p2.json()) as { data?: { expectedReturn?: number } };
  if (p1.status !== 200) fails.push("prediction HTTP " + p1.status);
  if (pred1.data?.calibratedLive !== false) fails.push("prediction claimed live calibration");
  if (pred1.data?.expectedReturn !== pred2.data?.expectedReturn) fails.push("prediction not deterministic");
  const kg = (await get("/v1/ecl/engine/kg?instrumentId=inst-pm-fed-cut-oct")) as {
    data?: { nationalGraph?: boolean; nodes?: { id?: string; analog?: boolean; live?: boolean; fixture?: boolean }[] };
  };
  if (kg.data?.nationalGraph !== false) fails.push("kg nationalGraph");
  const macroNode = kg.data?.nodes?.find((n) => n.id === "macro:rates");
  if (macroNode && (macroNode.live === true || macroNode.analog !== true)) fails.push("kg macro:rates not analog fixture");
  const execSim = await fetch(base + "/v1/ecl/engine/execution-sim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ allowed: true, price: 0.4, size: 10 }),
  });
  const execSimBody = (await execSim.json()) as { data?: { executed?: boolean } };
  if (execSimBody.data?.executed !== false) fails.push("execution-sim executed");
  const computeRes = await fetch(base + "/v1/ecl/engine/cockpit-compute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "smoke-user",
      instrumentId: "inst-pm-fed-cut-oct",
      action: "BUY",
      size: 50,
      horizonDays: 1,
      price: 0.4,
    }),
  });
  const compute = (await computeRes.json()) as {
    autoTrade?: boolean;
    data?: { executed?: boolean; inspectComputeMode?: string; engine?: string; limit?: { engine?: string } };
  };
  if (computeRes.status !== 200) fails.push("cockpit-compute HTTP " + computeRes.status);
  if (compute.autoTrade !== false) fails.push("cockpit-compute autoTrade");
  if (compute.data?.executed !== false) fails.push("cockpit-compute executed");
  if (compute.data?.inspectComputeMode !== "INSPECT_ONLY") fails.push("cockpit-compute flipped COMPUTE");
  if (compute.data?.engine !== "cockpit-compute-v1") fails.push("cockpit-compute engine stamp");
  if (compute.data?.limit?.engine !== "limit-engine-v1") fails.push("cockpit-compute missing limit");
  const buildInv = (await get("/v1/ecl/engine/build")) as { data?: { suite?: string; continuous?: boolean; ready?: boolean } };
  if (buildInv.data?.suite !== "BUILD_SUITE_V1") fails.push("build suite stamp");
  if (buildInv.data?.continuous !== false) fails.push("build suite continuous on");
  if (buildInv.data?.ready === true) fails.push("build suite READY");
  const evEmpty = (await get("/v1/ecl/engine/evidence-v2?instrumentId=inst-pm-fed-cut-oct")) as {
    data?: { status?: string; signals?: unknown[] };
  };
  if (evEmpty.data?.status !== "UNKNOWN") fails.push("evidence-v2 empty not UNKNOWN");
  const missingRiskAppend = await fetch(base + "/v1/ecl/engine/ledger/append", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "DECISION", instrumentId: "inst-pm-fed-cut-oct", payload: { decision: "HOLD" } }),
  });
  if (missingRiskAppend.status !== 200) fails.push("ledger append HTTP " + missingRiskAppend.status);
  const riskBook = (await get("/v1/ecl/engine/risk-book")) as {
    data?: { skippedUnknown?: number; durable?: boolean };
  };
  if ((riskBook.data?.skippedUnknown ?? 0) < 1) fails.push("risk-book treated missing riskScore as 0");
  if (riskBook.data?.durable !== false) fails.push("risk-book claimed durable");
  const computeV2Res = await fetch(base + "/v1/ecl/engine/cockpit-compute-v2", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "smoke-user",
      instrumentId: "inst-pm-fed-cut-oct",
      action: "BUY",
      size: 50,
      horizonDays: 1,
      price: 0.4,
    }),
  });
  const computeV2 = (await computeV2Res.json()) as {
    autoTrade?: boolean;
    data?: {
      engine?: string;
      executed?: boolean;
      inspectComputeMode?: string;
      durable?: boolean;
      ledgerSize?: number;
    };
  };
  if (computeV2Res.status !== 200) fails.push("cockpit-compute-v2 HTTP " + computeV2Res.status);
  if (computeV2.autoTrade !== false) fails.push("cockpit-compute-v2 autoTrade");
  if (computeV2.data?.engine !== "cockpit-compute-v2") fails.push("cockpit-compute-v2 engine stamp");
  if (computeV2.data?.executed !== false) fails.push("cockpit-compute-v2 executed");
  if (computeV2.data?.inspectComputeMode !== "INSPECT_ONLY") fails.push("cockpit-compute-v2 flipped COMPUTE");
  if (computeV2.data?.durable !== false) fails.push("cockpit-compute-v2 durable");
  if ((computeV2.data?.ledgerSize ?? 0) < 2) fails.push("cockpit-compute-v2 did not append ledger");
  const pnlBook = (await get("/v1/ecl/engine/pnl-book")) as {
    data?: { pnlByInstrument?: Record<string, number> };
  };
  if (typeof pnlBook.data?.pnlByInstrument?.["inst-pm-fed-cut-oct"] !== "number") {
    fails.push("pnl-book missing preview notional after compute-v2");
  }
  const kgReg = await fetch(base + "/v1/ecl/engine/kg/registry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      node: { id: "inst-pm-fed-cut-oct", type: "INSTRUMENT" },
      edges: [{ from: "macro:rates", to: "inst-pm-fed-cut-oct", relation: "SUPPORTS" }],
    }),
  });
  if (kgReg.status !== 200) fails.push("kg registry HTTP " + kgReg.status);
  const kgV2 = (await get("/v1/ecl/engine/kg-v2?instrumentId=inst-pm-fed-cut-oct")) as {
    data?: { nationalGraph?: boolean; status?: string };
  };
  if (kgV2.data?.nationalGraph !== false) fails.push("kg-v2 nationalGraph");
  const buildV2 = (await get("/v1/ecl/engine/build-v2")) as {
    data?: { suite?: string; durable?: boolean; ready?: boolean };
  };
  if (buildV2.data?.suite !== "BUILD_SUITE_V2") fails.push("build-v2 suite stamp");
  if (buildV2.data?.durable !== false) fails.push("build-v2 durable");
  if (buildV2.data?.ready === true) fails.push("build-v2 READY");
  const buildV3 = (await get("/v1/ecl/engine/build-v3")) as {
    data?: { suite?: string; ready?: boolean; autoTrade?: boolean; optionalInfra?: string; betaFabric?: boolean; fabric?: string };
    autoTrade?: boolean;
  };
  if (buildV3.data?.suite !== "BUILD_SUITE_V3") fails.push("build-v3 suite stamp");
  if (buildV3.data?.ready === true) fails.push("build-v3 READY");
  if (buildV3.autoTrade !== false) fails.push("build-v3 autoTrade");
  if (buildV3.data?.betaFabric === true) fails.push("build-v3 claimed BETA fabric");
  if (buildV3.data?.optionalInfra === "OPTIONAL_INFRA_READY" && buildV3.data?.fabric !== "ALPHA_ADAPTER") {
    fails.push("build-v3 READY infra without adapter honesty");
  }
  if (buildV3.data?.optionalInfra !== "OPTIONAL_INFRA_DEGRADED" && buildV3.data?.optionalInfra !== "OPTIONAL_INFRA_READY") {
    fails.push("build-v3 optionalInfra missing");
  }
  const engInfra = (await get("/v1/ecl/engine/infra")) as {
    data?: {
      ready?: boolean;
      autoTrade?: boolean;
      optionalInfra?: string;
      livePostgres?: boolean;
      pgDriver?: string;
      pgDriverProbe?: { basis?: string; resolvedFrom?: string | null; probeError?: string | null };
      daemon?: { enabledInBoot?: boolean; running?: boolean };
      pool?: { connected?: boolean };
    };
  };
  if (engInfra.data?.ready === true) fails.push("engine infra READY");
  if (engInfra.data?.autoTrade !== false) fails.push("engine infra autoTrade");
  if (engInfra.data?.livePostgres === true) fails.push("engine infra claimed live Postgres without driver");
  if (engInfra.data?.optionalInfra !== "OPTIONAL_INFRA_DEGRADED") fails.push("engine infra not DEGRADED without driver");
  // pgDriver is an observation about module resolution, not a product invariant:
  // the packaged runtime reports ABSENT while the tsx dev loader reaches pnpm's
  // store and reports PRESENT. What must hold either way is that driver
  // presence never promotes readiness, durability or live Postgres.
  if (!["PRESENT", "ABSENT", "UNKNOWN"].includes(String(engInfra.data?.pgDriver))) {
    fails.push("engine infra pgDriver not a recognised state");
  }
  if (engInfra.data?.pgDriver === "PRESENT") {
    if (engInfra.data?.livePostgres !== false) fails.push("pg driver present promoted livePostgres");
    if (engInfra.data?.optionalInfra !== "OPTIONAL_INFRA_DEGRADED") {
      fails.push("pg driver present promoted optionalInfra");
    }
    if (engInfra.data?.ready === true) fails.push("pg driver present promoted ready");
    if (engInfra.data?.pool?.connected === true) fails.push("pg driver present promoted pool connected");
  }
  if (engInfra.data?.pgDriver === "UNKNOWN" && !engInfra.data?.pgDriverProbe?.probeError) {
    fails.push("engine infra pgDriver UNKNOWN without a probe error");
  }
  if (engInfra.data?.daemon?.enabledInBoot === true) fails.push("engine infra daemon in boot");
  const clients = (await get("/v1/ecl/clients")) as {
    data?: {
      desktop?: { status?: string };
      mobile?: { hospitality?: { status?: string } };
      daemon?: { wiredIntoBoot?: boolean };
      autoTrade?: boolean;
    };
  };
  if (clients.data?.desktop?.status !== "REFUSED") fails.push("clients desktop not REFUSED");
  if (clients.data?.mobile?.hospitality?.status !== "SKIPPED_RESEARCH_REQUIRED") fails.push("clients hospitality desk");
  if (clients.data?.daemon?.wiredIntoBoot !== false) fails.push("clients daemon wired into boot");
  if (clients.data?.autoTrade !== false) fails.push("clients autoTrade");
  const aliasLedger = await fetch(base + "/v1/ledger/append", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "EXECUTION_PREVIEW",
      instrumentId: "inst-pm-fed-cut-oct",
      payload: { size: 2, previewFillPrice: 0.5 },
    }),
  });
  const aliasBody = (await aliasLedger.json()) as {
    data?: { durable?: boolean; livePostgres?: boolean };
    autoTrade?: boolean;
  };
  if (aliasLedger.status !== 200) fails.push("POST /v1/ledger/append HTTP " + aliasLedger.status);
  if (aliasBody.autoTrade !== false) fails.push("ledger append autoTrade");
  if (aliasBody.data?.livePostgres === true) fails.push("ledger claimed live Postgres without driver");
  const aliasPnl = (await get("/v1/pnl-book")) as { data?: { preview?: boolean; realized?: boolean } };
  if (aliasPnl.data?.preview !== true) fails.push("pnl-book preview flag");
  if (aliasPnl.data?.realized !== false) fails.push("pnl-book realized");
  const tradesAfterSuite = (await get("/v1/ecl/trades")) as { data?: unknown[] };
  if ((Array.isArray(tradesAfterSuite.data) ? tradesAfterSuite.data.length : 0) !== tradeNEval) {
    fails.push("engine suite mutated trades");
  }
  const liveResolve = await fetch(base + "/v1/dil/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId: first, outcome: 1, simulated: false }),
  });
  if (liveResolve.status !== 400) fails.push("live resolve must be rejected");
  return { prop };
}

server.listen(0, "127.0.0.1", async () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const fails: string[] = [];
  async function get(p: string) {
    const r = await fetch(base + p);
    const j = (await r.json()) as Record<string, unknown>;
    if (!r.ok) fails.push(`${p} HTTP ${r.status}`);
    if (j.autoTrade !== false) fails.push(`${p} autoTrade not false`);
    if (j.label !== "ALPHA_NON_PRODUCTION") fails.push(`${p} missing ALPHA label`);
    return j;
  }
  const markets = (await get("/v1/dil/markets")) as { data?: Array<{ marketId: string }> };
  await get("/v1/ecl/guardrail");
  await get("/v1/ecl/architecture");
  const eclWs = (await get("/v1/ecl/workspace")) as {
    persisted?: boolean;
    data?: {
      honesty?: { oidc?: string; otlp?: string; ledger?: string; ready?: boolean };
      feeds?: { liveAdapter?: string; bookIntegrity?: { orphanMarkets?: number; durable?: boolean } };
      infra?: { oidc?: string; ledger?: string };
    };
  };
  if (eclWs.persisted !== false) fails.push("ecl workspace persisted not false");
  if (eclWs.data?.honesty?.ready === true) fails.push("ecl workspace claimed READY");
  if (eclWs.data?.honesty?.oidc !== "ABSENT") fails.push("ecl workspace oidc not ABSENT");
  if (eclWs.data?.infra?.ledger !== "in-memory") fails.push("ecl workspace ledger not in-memory");
  if (process.env.SCI_DIL_FEED !== "live_unverified" && eclWs.data?.feeds?.liveAdapter !== "ABSENT") {
    fails.push("ecl workspace live adapter not ABSENT");
  }
  if (eclWs.data?.feeds?.bookIntegrity?.durable !== false) fails.push("ecl workspace claimed durable book");
  const infra = (await get("/v1/ecl/infra")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      enabled?: boolean;
      ready?: boolean;
      oidc?: string;
      ledger?: string;
      feedRegistry?: {
        health?: { registered?: number; liveCertified?: number };
        enabledLive?: boolean;
        autoTrade?: boolean;
        persisted?: boolean;
        simulationOnly?: boolean;
      };
      actual?: { feedLiveCertified?: number };
      hooks?: {
        oidc?: { status?: string; enabled?: boolean };
        liveCalibrationEngine?: { status?: string };
        executionEngine?: { status?: string; enabled?: boolean; live?: boolean };
      };
    };
  };
  if (infra.persisted !== false) fails.push("infra GET persisted not false");
  if (infra.autoTrade !== false) fails.push("infra envelope autoTrade not false");
  if (infra.data?.enabled !== false) fails.push("infra hooks enabled");
  if (infra.data?.ready === true) fails.push("infra claimed READY");
  if (infra.data?.oidc !== "ABSENT") fails.push("infra oidc not ABSENT");
  if (infra.data?.ledger !== "in-memory") fails.push("infra ledger not in-memory");
  if (infra.data?.hooks?.oidc?.status !== "ABSENT") fails.push("infra hook oidc not ABSENT");
  if (infra.data?.hooks?.oidc?.enabled !== false) fails.push("infra hook oidc enabled");
  if (infra.data?.hooks?.liveCalibrationEngine?.status !== "UNKNOWN") fails.push("infra live calibration not UNKNOWN");
  if (infra.data?.hooks?.executionEngine?.status !== "SIMULATION_ONLY") fails.push("infra execution not SIMULATION_ONLY");
  if (infra.data?.hooks?.executionEngine?.enabled !== false) fails.push("infra execution enabled");
  if (infra.data?.hooks?.executionEngine?.live !== false) fails.push("infra execution claimed live");
  if (infra.data?.feedRegistry?.health?.registered !== 13) fails.push("infra feed registry not 13");
  if (infra.data?.feedRegistry?.health?.liveCertified !== 0) fails.push("infra claimed live certified feeds");
  if (infra.data?.feedRegistry?.enabledLive !== false) fails.push("infra feed enabledLive");
  if (infra.data?.feedRegistry?.autoTrade !== false) fails.push("infra feed autoTrade");
  if (infra.data?.feedRegistry?.persisted !== false) fails.push("infra feed persisted");
  if (infra.data?.feedRegistry?.simulationOnly !== true) fails.push("infra feed not simulationOnly");
  if (infra.data?.actual?.feedLiveCertified !== 0) fails.push("infra actual feedLiveCertified not 0");
  const bp = (await get("/v1/ecl/blueprints")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      enabled?: boolean;
      autoApply?: boolean;
      secondWorkflowEngine?: boolean;
      safeActivation?: boolean;
      wiredIntoOs?: boolean;
      surfaces?: {
        lda?: { status?: string; autoPatch?: boolean };
        knowledgeGraph?: { nationalGraph?: boolean };
        workflowDsl?: { secondEngine?: boolean };
        distributedOs?: { kafka?: string; multiRegion?: boolean };
      };
    };
  };
  if (bp.persisted !== false) fails.push("blueprints GET persisted not false");
  if (bp.autoTrade !== false) fails.push("blueprints autoTrade not false");
  if (bp.data?.enabled !== false) fails.push("blueprints enabled");
  if (bp.data?.safeActivation !== true) fails.push("blueprints missing safeActivation");
  if (bp.data?.wiredIntoOs !== true) fails.push("blueprints not wired into OS");
  if (bp.data?.autoApply !== false) fails.push("blueprints autoApply");
  if (bp.data?.secondWorkflowEngine !== false) fails.push("blueprints second workflow engine");
  if (bp.data?.surfaces?.lda?.status !== "ABSENT") fails.push("lda not ABSENT");
  if (bp.data?.surfaces?.lda?.autoPatch !== false) fails.push("lda autoPatch");
  if (bp.data?.surfaces?.knowledgeGraph?.nationalGraph !== false) fails.push("national KG claimed");
  if (bp.data?.surfaces?.workflowDsl?.secondEngine !== false) fails.push("second workflow engine claimed");
  if (bp.data?.surfaces?.distributedOs?.kafka !== "ABSENT") fails.push("kafka not ABSENT");
  if (bp.data?.surfaces?.distributedOs?.multiRegion !== false) fails.push("multiRegion claimed");
  const dep = (await get("/v1/ecl/deployment")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      enabledRuntimes?: boolean;
      ready?: boolean;
      secondWorkflowEngine?: boolean;
      oneBoot?: boolean;
      oneShell?: boolean;
      liveCertifiedFeeds?: number;
      health?: { registered?: number };
      modules?: unknown[];
    };
  };
  if (dep.persisted !== false) fails.push("deployment GET persisted not false");
  if (dep.autoTrade !== false) fails.push("deployment autoTrade not false");
  if (dep.data?.enabledRuntimes !== false) fails.push("deployment enabledRuntimes");
  if (dep.data?.ready === true) fails.push("deployment claimed READY");
  if (dep.data?.secondWorkflowEngine !== false) fails.push("deployment second workflow engine");
  if (dep.data?.oneBoot !== true) fails.push("deployment oneBoot");
  if (dep.data?.oneShell !== true) fails.push("deployment oneShell");
  if (dep.data?.liveCertifiedFeeds !== 0) fails.push("deployment live certified feeds");
  if (!Array.isArray(dep.data?.modules) || dep.data.modules.length !== 36) fails.push("deployment missing 36 modules");
  const rsim = (await get("/v1/ecl/realistic-sim")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      enabledFull?: boolean;
      monteCarlo?: boolean;
      doCalculus?: boolean;
      affectModel?: boolean;
      liveCertified?: number;
      unexpectedLive?: boolean;
      raft?: boolean;
      legalGuardian?: { autoTrade?: boolean; requiresHuman?: boolean; legalCounsel?: boolean };
      competition?: { ranked?: Array<{ autoTrade?: boolean }> };
      os?: { raft?: boolean };
    };
  };
  if (rsim.persisted !== false) fails.push("realistic-sim persisted not false");
  if (rsim.autoTrade !== false) fails.push("realistic-sim autoTrade not false");
  if (rsim.data?.enabledFull !== false) fails.push("realistic-sim enabledFull");
  if (rsim.data?.monteCarlo !== false) fails.push("realistic-sim monteCarlo");
  if (rsim.data?.doCalculus !== false) fails.push("realistic-sim doCalculus");
  if (rsim.data?.affectModel !== false) fails.push("realistic-sim affectModel");
  if (rsim.data?.liveCertified !== 0) fails.push("realistic-sim liveCertified");
  if (rsim.data?.unexpectedLive === true) fails.push("realistic-sim unexpected live");
  if (rsim.data?.raft === true) fails.push("realistic-sim claimed raft");
  if (rsim.data?.legalGuardian?.autoTrade !== false) fails.push("legalGuardian autoTrade");
  if (rsim.data?.legalGuardian?.requiresHuman !== true) fails.push("legalGuardian requiresHuman");
  if (rsim.data?.legalGuardian?.legalCounsel !== false) fails.push("legalGuardian claimed counsel");
  if (rsim.data?.os?.raft === true) fails.push("os claimed raft");
  if (rsim.data?.competition?.ranked?.some((r) => r.autoTrade !== false)) fails.push("competition autoTrade");
  const pro = (await get("/v1/ecl/professional")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      enabled?: boolean;
      ready?: boolean;
      simulationOnly?: boolean;
      liveDomainData?: boolean;
      fullProfessionalSystem?: boolean;
      enabledFull?: boolean;
      catalogs?: Array<{ id?: string }>;
      sandboxes?: Array<{ mode?: string; liveData?: boolean; autoTrade?: boolean }>;
      registry?: { rolesSeeded?: number; rolesFullySpecified?: number };
      health?: { sandboxLiveData?: number; unexpectedLive?: boolean };
    };
  };
  if (pro.persisted !== false) fails.push("professional persisted not false");
  if (pro.autoTrade !== false) fails.push("professional autoTrade not false");
  if (pro.data?.enabled !== false) fails.push("professional enabled");
  if (pro.data?.ready === true) fails.push("professional claimed READY");
  if (pro.data?.simulationOnly !== true) fails.push("professional not simulationOnly");
  if (pro.data?.liveDomainData !== false) fails.push("professional liveDomainData");
  if (pro.data?.fullProfessionalSystem !== true) fails.push("professional fullProfessionalSystem");
  if (pro.data?.enabledFull !== false) fails.push("professional enabledFull");
  if (!pro.data?.catalogs?.some((c) => c.id === "AllDomains")) fails.push("professional missing AllDomains");
  if (!Array.isArray(pro.data?.catalogs) || pro.data.catalogs.length !== 16) fails.push("professional catalogs not 16");
  if (!Array.isArray(pro.data?.sandboxes) || pro.data.sandboxes.length !== 16) fails.push("professional sandboxes not 16");
  if (pro.data?.registry?.rolesSeeded !== 200) fails.push("professional rolesSeeded not 200");
  if (pro.data?.registry?.rolesFullySpecified !== 9) fails.push("professional claimed fully specified catalog");
  if (pro.data?.health?.sandboxLiveData !== 0) fails.push("professional sandbox live data");
  if (pro.data?.sandboxes?.some((s) => s.mode !== "SIMULATION_ONLY" || s.liveData !== false || s.autoTrade !== false)) {
    fails.push("professional sandbox not SIMULATION_ONLY");
  }
  const rolesAlias = (await get("/v1/ecl/roles")) as { persisted?: boolean; data?: { catalogs?: unknown[] } };
  if (rolesAlias.persisted !== false) fails.push("roles GET persisted not false");
  if (!Array.isArray(rolesAlias.data?.catalogs) || rolesAlias.data.catalogs.length !== 16) fails.push("roles alias catalogs not 16");
  const bpCat = (await get("/v1/ecl/professional/blueprints")) as {
    data?: {
      rolesSeeded?: number;
      familyOverlays?: number;
      roles200Validated?: boolean;
      inventedSops?: boolean;
      honesty?: { autoTrade?: boolean; ready?: boolean; durable?: boolean; pgDriver?: string };
      specialistInheritOnly?: number;
    };
  };
  if (bpCat.data?.rolesSeeded !== 200) fails.push("blueprints catalog not 200");
  if (bpCat.data?.familyOverlays !== 21) fails.push("blueprints overlays not 21");
  if (bpCat.data?.roles200Validated !== false) fails.push("blueprints claimed 200 validated");
  if (bpCat.data?.inventedSops !== false) fails.push("blueprints inventedSops");
  if (bpCat.data?.honesty?.autoTrade !== false || bpCat.data?.honesty?.ready !== false) fails.push("blueprints honesty flipped");
  if (bpCat.data?.honesty?.durable !== false) fails.push("blueprints durable flipped");
  if (bpCat.data?.honesty?.pgDriver !== "ABSENT") fails.push("blueprints pgDriver not ABSENT");
  if (bpCat.data?.specialistInheritOnly !== 65) fails.push("blueprints specialist count");
  const bpOne = (await get("/v1/ecl/professional/blueprint?roleId=role.cyber_ops.soc_analyst")) as {
    data?: { inherit?: string; inventedSops?: boolean; family?: { ohlc?: boolean }; honesty?: { execution?: boolean } };
  };
  if (bpOne.data?.inherit !== "FAM-01") fails.push("blueprint soc inherit");
  if (bpOne.data?.inventedSops !== false) fails.push("blueprint soc SOP");
  if (bpOne.data?.family?.ohlc === true) fails.push("blueprint cyber ohlc");
  if (bpOne.data?.honesty?.execution !== false) fails.push("blueprint execution flipped");
  const bpSpec = (await get("/v1/ecl/professional/blueprint?roleId=role.cyber_ops.specialist_141")) as {
    data?: { specialist?: boolean; deltas?: Record<string, unknown> };
  };
  if (bpSpec.data?.specialist !== true) fails.push("blueprint specialist flag");
  if (bpSpec.data?.deltas && Object.keys(bpSpec.data.deltas).length > 0) fails.push("blueprint specialist deltas");
  const bpMissing = await fetch(base + "/v1/ecl/professional/blueprint?roleId=role.missing.nope");
  if (bpMissing.status !== 404) fails.push("blueprint missing HTTP " + bpMissing.status);
  const bpMkt = (await get("/v1/ecl/professional/blueprint?roleId=role.market_portfolio_risk.var_analyst")) as {
    data?: { family?: { ohlc?: boolean; marketRef?: boolean } };
  };
  if (bpMkt.data?.family?.ohlc !== true) fails.push("blueprint FAM-08 ohlc");
  if (bpMkt.data?.family?.marketRef !== true) fails.push("blueprint FAM-08 marketRef");
  const heroSoc = (await get("/v1/ecl/professional/hero?roleId=role.cyber_ops.soc_analyst")) as {
    data?: {
      schema?: string;
      inventedSops?: boolean;
      simulation?: { simulated?: boolean; executed?: boolean };
      honesty?: { ready?: boolean; autoTrade?: boolean };
      family?: { famId?: string; ohlc?: boolean };
      missionPanels?: unknown[];
    };
  };
  if (heroSoc.data?.schema !== "sci-os-hero-v3/v1") fails.push("hero v3 schema");
  if (heroSoc.data?.inventedSops !== false) fails.push("hero invented SOP");
  if (heroSoc.data?.simulation?.simulated !== true || heroSoc.data?.simulation?.executed !== false) {
    fails.push("hero simulation honesty");
  }
  if (heroSoc.data?.honesty?.ready === true || heroSoc.data?.honesty?.autoTrade === true) fails.push("hero honesty flipped");
  if (heroSoc.data?.family?.famId !== "FAM-01") fails.push("hero FAM-01");
  if (!Array.isArray(heroSoc.data?.missionPanels) || heroSoc.data.missionPanels.length !== 8) {
    fails.push("hero mission panels");
  }
  const famHosp = (await get("/v1/ecl/professional/family-ux?familyId=hospitality")) as {
    data?: { status?: string; skip?: boolean };
  };
  if (famHosp.data?.status !== "SKIPPED_RESEARCH_REQUIRED") fails.push("family-ux hospitality not skipped");
  const box = (await get("/v1/ecl/professional/master-box")) as {
    data?: { ready?: boolean; heroCount?: number; familyUxCount?: number; pgDriver?: string };
  };
  if (box.data?.ready === true) fails.push("master-box claimed READY");
  if (box.data?.heroCount !== 200) fails.push("master-box hero count");
  if (box.data?.familyUxCount !== 21) fails.push("master-box family count");
  if (box.data?.pgDriver !== "ABSENT") fails.push("master-box pgDriver");
  const heroMissing = await fetch(base + "/v1/ecl/professional/hero?roleId=role.missing.nope");
  if (heroMissing.status !== 404) fails.push("hero missing HTTP " + heroMissing.status);
  const auditBeforeCompile = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const compiled = (await get("/v1/ecl/professional/compile")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      inventedSops?: boolean;
      uniqueArchetypes?: unknown[];
      catalogs?: Array<{ id?: string; result?: string; inventedSops?: boolean; archetypes?: Array<{ liveExecutionEnabled?: boolean; autoTrade?: boolean }> }>;
      blueprints?: Array<{ id?: string; result?: string; autoPatch?: boolean }>;
      sandboxes?: Array<{ mode?: string; liveData?: boolean }>;
      health?: { archetypesExecuted?: number; liveExecution?: boolean; skippedResearchRequired?: number };
    };
  };
  if (compiled.persisted !== false) fails.push("compile persisted not false");
  if (compiled.autoTrade !== false) fails.push("compile autoTrade not false");
  if (compiled.data?.ready === true) fails.push("compile claimed READY");
  if (compiled.data?.inventedSops !== false) fails.push("compile invented SOPs");
  if ((compiled.data?.uniqueArchetypes || []).length !== 9) fails.push("compile unique archetypes not 9");
  if (compiled.data?.health?.archetypesExecuted !== 9) fails.push("compile did not execute 9 archetypes");
  if (compiled.data?.health?.liveExecution === true) fails.push("compile enabled live execution");
  if (!compiled.data?.catalogs?.some((c) => c.id === "Hospitality" && c.result === "SKIPPED_RESEARCH_REQUIRED")) {
    fails.push("compile hospitality not skipped");
  }
  if (compiled.data?.catalogs?.some((c) => c.inventedSops !== false)) fails.push("compile catalog invented SOPs");
  if (compiled.data?.catalogs?.some((c) => c.archetypes?.some((a) => a.liveExecutionEnabled === true || a.autoTrade !== false))) {
    fails.push("compile archetype live execution or autoTrade");
  }
  if (!compiled.data?.blueprints?.some((b) => b.id === "AgentSystem.LDA" && b.result === "REFUSED" && b.autoPatch === false)) {
    fails.push("compile LDA not refused");
  }
  if (compiled.data?.sandboxes?.some((s) => s.mode !== "SIMULATION_ONLY" || s.liveData !== false)) {
    fails.push("compile sandbox not SIMULATION_ONLY");
  }
  const auditAfterCompile = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterCompile.data?.length || 0) !== (auditBeforeCompile.data?.length || 0)) {
    fails.push("compile GET mutated audit");
  }
  const auditBeforeValidate = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const wave = (await get("/v1/ecl/professional/validate")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      roles200Validated?: boolean;
      wave?: string;
      inventedSops?: boolean;
      health?: { fail?: number; archetypesEvidenced?: number; rolesSeeded?: number };
      roles?: Array<{ id?: string; verdict?: string }>;
      blueprints?: Array<{ id?: string; verdict?: string }>;
      sandboxes?: Array<{ id?: string; verdict?: string }>;
    };
  };
  if (wave.persisted !== false) fails.push("validate persisted not false");
  if (wave.autoTrade !== false) fails.push("validate autoTrade not false");
  if (wave.data?.ready === true) fails.push("validate claimed READY");
  if (wave.data?.roles200Validated !== false) fails.push("validate claimed 200 roles");
  if (wave.data?.wave === "FAIL") fails.push("validate wave FAIL");
  if (wave.data?.wave !== "PARTIAL") fails.push("validate wave not PARTIAL");
  if (wave.data?.health?.fail !== 0) fails.push("validate unexpected FAIL checks");
  if (wave.data?.health?.archetypesEvidenced !== 9) fails.push("validate archetypes evidenced not 9");
  if (wave.data?.health?.rolesSeeded !== 200) fails.push("validate rolesSeeded not 200");
  if (!wave.data?.roles?.some((c) => c.id === "RoleCatalog.AllDomains" && c.verdict === "PARTIAL")) {
    fails.push("validate AllDomains not PARTIAL");
  }
  if (!wave.data?.blueprints?.some((c) => c.id === "AgentSystem.LDA" && c.verdict === "PASS_CONSTRAINT")) {
    fails.push("validate LDA not correctly refused");
  }
  if (!wave.data?.blueprints?.some((c) => c.id === "WorkflowDSL.Core" && c.verdict === "UNKNOWN")) {
    fails.push("validate WorkflowDSL claimed PASS");
  }
  if (!wave.data?.sandboxes?.some((c) => c.id === "Sandbox.mode" && c.verdict === "PASS_CONSTRAINT")) {
    fails.push("validate sandbox mode");
  }
  const auditAfterValidate = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterValidate.data?.length || 0) !== (auditBeforeValidate.data?.length || 0)) {
    fails.push("validate GET mutated audit");
  }
  const auditBeforeDeep = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const deep = (await get("/v1/ecl/professional/validate/deep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      roles200Validated?: boolean;
      wave?: string;
      probes?: Array<{ liveBlocked?: boolean; liveExecutionEnabled?: boolean; panelCount?: number }>;
      health?: { fail?: number; probes?: number; liveBlocked?: number };
      pipelines?: Array<{ id?: string; verdict?: string }>;
      blueprints?: Array<{ id?: string; verdict?: string }>;
    };
  };
  if (deep.persisted !== false) fails.push("deep validate persisted not false");
  if (deep.autoTrade !== false) fails.push("deep validate autoTrade not false");
  if (deep.data?.ready === true) fails.push("deep validate claimed READY");
  if (deep.data?.roles200Validated !== false) fails.push("deep validate claimed 200 roles");
  if (deep.data?.wave !== "PARTIAL") fails.push("deep validate wave not PARTIAL");
  if (deep.data?.health?.fail !== 0) fails.push("deep validate unexpected FAIL");
  if (deep.data?.health?.probes !== 9) fails.push("deep validate probes not 9");
  if (deep.data?.probes?.some((p) => p.liveExecutionEnabled === true || p.liveBlocked === false)) {
    fails.push("deep validate live execution leak");
  }
  if (!deep.data?.pipelines?.some((c) => c.id === "PolicyEngine.deep" && c.verdict === "PASS_CONSTRAINT")) {
    fails.push("deep validate policy not PASS_CONSTRAINT");
  }
  if (!deep.data?.blueprints?.some((c) => c.id === "WorkflowDSL.Core.deep" && c.verdict === "UNKNOWN")) {
    fails.push("deep validate DSL claimed PASS");
  }
  const auditAfterDeep = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterDeep.data?.length || 0) !== (auditBeforeDeep.data?.length || 0)) {
    fails.push("deep validate GET mutated audit");
  }
  const auditBeforeActivate = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const activated = (await get("/v1/ecl/professional/activate")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      roles200Activated?: boolean;
      sessionActivation?: boolean;
      enabledFull?: boolean;
      wave?: string;
      probes?: Array<{ activation?: string; liveBlocked?: boolean; liveExecutionEnabled?: boolean }>;
      health?: { fail?: number; probes?: number; archetypesActivated?: number };
      roles?: Array<{ id?: string; result?: string }>;
      blueprints?: Array<{ id?: string; result?: string }>;
      sandboxes?: Array<{ id?: string; result?: string }>;
      pipelines?: Array<{ id?: string; result?: string }>;
    };
  };
  if (activated.persisted !== false) fails.push("activate persisted not false");
  if (activated.autoTrade !== false) fails.push("activate autoTrade not false");
  if (activated.data?.ready === true) fails.push("activate claimed READY");
  if (activated.data?.roles200Activated !== false) fails.push("activate claimed 200 roles");
  if (activated.data?.enabledFull !== false) fails.push("activate enabledFull");
  if (activated.data?.sessionActivation !== true) fails.push("activate sessionActivation");
  if (activated.data?.wave !== "PARTIAL") fails.push("activate wave not PARTIAL");
  if (activated.data?.health?.fail !== 0) fails.push("activate unexpected FAIL");
  if (activated.data?.health?.probes !== 9) fails.push("activate probes not 9");
  if (activated.data?.health?.archetypesActivated !== 9) fails.push("activate archetypes not 9");
  if (activated.data?.probes?.some((p) => p.liveExecutionEnabled === true || p.liveBlocked === false || p.activation === "FAIL")) {
    fails.push("activate live execution leak");
  }
  if (!activated.data?.roles?.some((c) => c.id === "RoleCatalog.AllDomains" && c.result === "ACTIVATED_SIMULATION")) {
    fails.push("activate AllDomains not session-mounted");
  }
  if (!activated.data?.blueprints?.some((c) => c.id === "AgentSystem.LDA" && c.result === "REFUSED")) {
    fails.push("activate LDA not refused");
  }
  if (!activated.data?.blueprints?.some((c) => c.id === "WorkflowDSL.Core" && c.result === "SKIPPED_UNKNOWN")) {
    fails.push("activate DSL claimed activated");
  }
  if (!activated.data?.sandboxes?.some((c) => c.id === "Sandbox.mode" && c.result === "ACTIVATED_SIMULATION")) {
    fails.push("activate sandbox mode");
  }
  if (!activated.data?.pipelines?.some((c) => c.id === "PolicyEngine" && c.result === "ACTIVATED_SIMULATION")) {
    fails.push("activate policy");
  }
  const auditAfterActivate = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterActivate.data?.length || 0) !== (auditBeforeActivate.data?.length || 0)) {
    fails.push("activate GET mutated audit");
  }
  const auditBeforeStabilize = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const stab = (await get("/v1/ecl/professional/stabilize")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      roles200Stabilized?: boolean;
      stabilized?: boolean;
      wave?: string;
      reconcile?: Record<string, string>;
      consistentPipelines?: string[];
      disabledViews?: Array<{ id?: string; view?: string }>;
      health?: { fail?: number; archetypesConsistent?: number; incomplete?: number };
    };
  };
  if (stab.persisted !== false) fails.push("stabilize persisted not false");
  if (stab.autoTrade !== false) fails.push("stabilize autoTrade not false");
  if (stab.data?.ready === true) fails.push("stabilize claimed READY");
  if (stab.data?.roles200Stabilized !== false) fails.push("stabilize claimed 200 roles");
  if (stab.data?.stabilized !== true) fails.push("stabilize not reconciled");
  if (stab.data?.wave !== "PARTIAL") fails.push("stabilize wave not PARTIAL");
  if (stab.data?.health?.fail !== 0) fails.push("stabilize unexpected FAIL");
  if (stab.data?.health?.archetypesConsistent !== 9) fails.push("stabilize consistent not 9");
  if (stab.data?.health?.incomplete !== 191) fails.push("stabilize incomplete not 191");
  if (stab.data?.reconcile?.["AgentSystem.LDA"] !== "REFUSED") fails.push("stabilize LDA");
  if (stab.data?.reconcile?.["KnowledgeGraph.Core"] !== "ANALOG") fails.push("stabilize KG");
  if (stab.data?.consistentPipelines?.includes("AgentSystem.LDA")) fails.push("stabilize kept LDA");
  if (stab.data?.consistentPipelines?.includes("WorkflowDSL.Core")) fails.push("stabilize kept DSL");
  if (!stab.data?.disabledViews?.some((v) => v.id === "RoleCatalog.Hospitality" && v.view === "disabled")) {
    fails.push("stabilize hospitality not disabled");
  }
  const auditAfterStabilize = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  if ((auditAfterStabilize.data?.length || 0) !== (auditBeforeStabilize.data?.length || 0)) {
    fails.push("stabilize GET mutated audit");
  }
  const mods = (await get("/v1/ecl/professional/modules")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      liveDomainData?: boolean;
      inventedSops?: boolean;
      professions?: Array<{ id?: string; result?: string; catalogStatus?: string }>;
      health?: { liveDomainData?: number };
    };
  };
  if (mods.persisted !== false) fails.push("modules persisted not false");
  if (mods.autoTrade !== false) fails.push("modules autoTrade not false");
  if (mods.data?.ready === true) fails.push("modules claimed READY");
  if (mods.data?.liveDomainData !== false) fails.push("modules liveDomainData");
  if (mods.data?.inventedSops !== false) fails.push("modules inventedSops");
  if (mods.data?.health?.liveDomainData !== 0) fails.push("modules live domain count");
  if (mods.data?.professions?.find((p) => p.id === "hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("modules hospitality not skipped");
  }
  if (mods.data?.professions?.find((p) => p.id === "supply-chain")?.catalogStatus !== "STUB") {
    fails.push("modules supply-chain not STUB");
  }
  const hosp = (await get("/v1/ecl/professional/modules?professionId=hospitality")) as {
    persisted?: boolean;
    data?: { prediction?: { status?: string; series?: unknown[] }; intelligence?: { edge?: unknown } };
  };
  if (hosp.persisted !== false) fails.push("modules apply persisted not false");
  if (hosp.data?.prediction?.status !== "SKIPPED_RESEARCH_REQUIRED") fails.push("modules hospitality series not skipped");
  if (Array.isArray(hosp.data?.prediction?.series) && hosp.data.prediction.series.length) {
    fails.push("modules hospitality invented series");
  }
  if (hosp.data?.intelligence?.edge != null) fails.push("modules hospitality invented edge");
  if (pro.data && !("moduleExpansion" in (pro.data as object))) fails.push("professional missing moduleExpansion");
  if (pro.data && !("osBlueprints" in (pro.data as object))) fails.push("professional missing osBlueprints");
  const osbp = (await get("/v1/ecl/professional/os-blueprints")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      liveSiem?: boolean;
      liveErp?: boolean;
      nationalGraph?: boolean;
      secondWorkflowEngine?: boolean;
      blueprints?: Array<{ id?: string; result?: string; catalogStatus?: string }>;
      sapAlt?: { hr?: { result?: string }; secondWorkflowEngine?: boolean; integration?: { decisions?: string } };
      kg?: { nationalGraph?: boolean; layers?: { governance?: string[] } };
      moduleMapping?: { PredictionPanel?: { researchRequired?: string[] } };
      health?: { archetypesUnchanged?: number };
    };
  };
  if (osbp.persisted !== false) fails.push("os-blueprints persisted not false");
  if (osbp.autoTrade !== false) fails.push("os-blueprints autoTrade not false");
  if (osbp.data?.ready === true) fails.push("os-blueprints claimed READY");
  if (osbp.data?.liveSiem !== false) fails.push("os-blueprints liveSiem");
  if (osbp.data?.liveErp !== false) fails.push("os-blueprints liveErp");
  if (osbp.data?.nationalGraph !== false) fails.push("os-blueprints nationalGraph");
  if (osbp.data?.secondWorkflowEngine !== false) fails.push("os-blueprints second workflow");
  if (osbp.data?.blueprints?.find((b) => b.id === "cyber")?.result !== "REGISTERED_ANALOG") {
    fails.push("os-blueprints cyber not analog");
  }
  if (osbp.data?.blueprints?.find((b) => b.id === "ops")?.catalogStatus !== "STUB") {
    fails.push("os-blueprints ops not STUB");
  }
  if (osbp.data?.sapAlt?.hr?.result !== "SKIPPED_RESEARCH_REQUIRED") fails.push("os-blueprints HR not skipped");
  if (osbp.data?.kg?.nationalGraph !== false) fails.push("os-blueprints KG national");
  if (!osbp.data?.kg?.layers?.governance) fails.push("os-blueprints KG layers");
  if (!osbp.data?.sapAlt?.integration?.decisions) fails.push("os-blueprints SAP integration");
  if (!osbp.data?.moduleMapping?.PredictionPanel?.researchRequired?.includes("hospitality")) {
    fails.push("os-blueprints module map hospitality");
  }
  if (osbp.data?.health?.archetypesUnchanged !== 9) fails.push("os-blueprints invented archetypes");
  const cyberApply = (await get("/v1/ecl/professional/os-blueprints?blueprintId=cyber")) as {
    persisted?: boolean;
    data?: { prediction?: { status?: string; series?: unknown[] }; liveSiem?: boolean; intelligence?: { edge?: unknown } };
  };
  if (cyberApply.persisted !== false) fails.push("os-blueprints apply persisted");
  if (cyberApply.data?.prediction?.status !== "UNKNOWN") fails.push("os-blueprints cyber invented series");
  if (Array.isArray(cyberApply.data?.prediction?.series) && cyberApply.data.prediction.series.length) {
    fails.push("os-blueprints cyber series length");
  }
  if (cyberApply.data?.liveSiem !== false) fails.push("os-blueprints apply liveSiem");
  if (cyberApply.data?.intelligence?.edge != null) fails.push("os-blueprints cyber invented edge");
  if (pro.data && !("digitalActivation" in (pro.data as object))) fails.push("professional missing digitalActivation");
  if (pro.data && !("precisionUpgrade" in (pro.data as object))) fails.push("professional missing precisionUpgrade");
  const auditBeforeDigital = (await get("/v1/ecl/audit")) as { data?: unknown[] };
  const dact = (await get("/v1/ecl/professional/digital-activation")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      digitalRuntime?: boolean;
      nationalGraph?: boolean;
      causalQuery?: boolean;
      ldaPass?: boolean;
      seedsComplete?: number;
      roles200Stabilized?: boolean;
      wave?: string;
      domains?: Array<{ id?: string; result?: string }>;
    };
  };
  if (dact.persisted !== false) fails.push("digital-activation persisted not false");
  if (dact.autoTrade !== false) fails.push("digital-activation autoTrade not false");
  if (dact.data?.ready === true) fails.push("digital-activation claimed READY");
  if (dact.data?.digitalRuntime !== false) fails.push("digital-activation digitalRuntime");
  if (dact.data?.nationalGraph !== false) fails.push("digital-activation nationalGraph");
  if (dact.data?.causalQuery !== false) fails.push("digital-activation causalQuery");
  if (dact.data?.ldaPass !== false) fails.push("digital-activation ldaPass");
  if (dact.data?.seedsComplete !== 0) fails.push("digital-activation seedsComplete");
  if (dact.data?.roles200Stabilized !== false) fails.push("digital-activation 200 roles");
  if (dact.data?.wave !== "REFUSED") fails.push("digital-activation wave not REFUSED");
  if (dact.data?.domains?.find((d) => d.id === "Domain.hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("digital-activation hospitality not skipped");
  }
  const prec = (await get("/v1/ecl/professional/precision-upgrade")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      showCausalPaths?: boolean;
      minSeriesLengthEnforced?: boolean;
      ldaPass?: boolean;
      wave?: string;
      kgSpine?: { defaults?: { showCausalPaths?: boolean }; layers?: unknown[] };
      domainFlows?: Array<{ id?: string; result?: string }>;
      cockpitFlows?: { Decisions?: { autoDecide?: boolean }; PredictionPanel?: { researchRequired?: string[] } };
    };
  };
  if (prec.persisted !== false) fails.push("precision-upgrade persisted not false");
  if (prec.autoTrade !== false) fails.push("precision-upgrade autoTrade not false");
  if (prec.data?.ready === true) fails.push("precision-upgrade claimed READY");
  if (prec.data?.showCausalPaths !== false) fails.push("precision-upgrade causal paths");
  if (prec.data?.minSeriesLengthEnforced !== false) fails.push("precision-upgrade minSeriesLength");
  if (prec.data?.ldaPass !== false) fails.push("precision-upgrade ldaPass");
  if (prec.data?.wave !== "REFUSED") fails.push("precision-upgrade wave not REFUSED");
  if (prec.data?.kgSpine?.defaults?.showCausalPaths !== false) fails.push("precision-upgrade spine causal");
  if (!Array.isArray(prec.data?.kgSpine?.layers) || prec.data.kgSpine.layers.length !== 3) {
    fails.push("precision-upgrade spine layers");
  }
  if (prec.data?.domainFlows?.find((d) => d.id === "DomainFlow.hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("precision-upgrade hospitality not skipped");
  }
  if (prec.data?.cockpitFlows?.Decisions?.autoDecide !== false) fails.push("precision-upgrade autoDecide");
  if (!prec.data?.cockpitFlows?.PredictionPanel?.researchRequired?.includes("hospitality")) {
    fails.push("precision-upgrade prediction hospitality");
  }
  if (pro.data && !("cyberBridge" in (pro.data as object))) fails.push("professional missing cyberBridge");
  const br = (await get("/v1/ecl/professional/cyber-bridge")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      researchComplete?: boolean;
      domainEnabled?: boolean;
      liveSiem?: boolean;
      livePnlImpact?: boolean;
      ldaPass?: boolean;
      autoDecide?: boolean;
      wave?: string;
      research?: Array<{ id?: string; result?: string }>;
      enable?: Array<{ id?: string; result?: string }>;
      bridge?: Array<{ id?: string; result?: string }>;
      bridgeSpec?: { wave1Kind?: string };
    };
  };
  if (br.persisted !== false) fails.push("cyber-bridge persisted not false");
  if (br.autoTrade !== false) fails.push("cyber-bridge autoTrade not false");
  if (br.data?.ready === true) fails.push("cyber-bridge claimed READY");
  if (br.data?.researchComplete !== false) fails.push("cyber-bridge researchComplete");
  if (br.data?.domainEnabled !== false) fails.push("cyber-bridge domainEnabled");
  if (br.data?.liveSiem !== false) fails.push("cyber-bridge liveSiem");
  if (br.data?.livePnlImpact !== false) fails.push("cyber-bridge livePnl");
  if (br.data?.ldaPass !== false) fails.push("cyber-bridge ldaPass");
  if (br.data?.autoDecide !== false) fails.push("cyber-bridge autoDecide");
  if (br.data?.wave !== "REFUSED") fails.push("cyber-bridge wave not REFUSED");
  if (br.data?.research?.find((c) => c.id === "Cyber.researchComplete")?.result !== "REFUSED") {
    fails.push("cyber-bridge researchComplete check");
  }
  if (br.data?.enable?.find((c) => c.id === "Cyber.enableDomain")?.result !== "REFUSED") {
    fails.push("cyber-bridge enableDomain");
  }
  if (br.data?.bridge?.find((c) => c.id === "Bridge.enable")?.result !== "REFUSED") {
    fails.push("cyber-bridge Bridge.enable");
  }
  if (br.data?.bridgeSpec?.wave1Kind !== "risk") fails.push("cyber-bridge RiskEvent map");
  const cyberEmpty = (await get("/v1/ecl/professional/os-blueprints?blueprintId=cyber")) as {
    data?: { prediction?: { status?: string; series?: unknown[] }; intelligence?: { edge?: unknown }; liveSiem?: boolean };
  };
  if (cyberEmpty.data?.prediction?.status !== "UNKNOWN") fails.push("cyber enable invented series status");
  if (Array.isArray(cyberEmpty.data?.prediction?.series) && cyberEmpty.data.prediction.series.length) {
    fails.push("cyber enable invented series");
  }
  if (cyberEmpty.data?.intelligence?.edge != null) fails.push("cyber enable invented edge");
  if (cyberEmpty.data?.liveSiem !== false) fails.push("cyber enable liveSiem");
  if (pro.data && !("activationReview" in (pro.data as object))) fails.push("professional missing activationReview");
  const ar = (await get("/v1/ecl/professional/activation-review")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      ldaPass?: boolean;
      nationalGraph?: boolean;
      causalQuery?: boolean;
      seedsComplete?: number;
      roles200Stabilized?: boolean;
      computeEnabled?: boolean;
      autoDecide?: boolean;
      wave?: string;
      layers?: Array<{ id?: string; result?: string }>;
      domains?: Array<{ id?: string; result?: string }>;
      next?: Array<{ id?: string; result?: string }>;
      nextWave?: { liveFeeds?: { siem_feed?: { enabled?: boolean } }; autoAudit?: { autoApply?: boolean } };
      health?: { layersUnlocked?: number };
    };
  };
  if (ar.persisted !== false) fails.push("activation-review persisted not false");
  if (ar.autoTrade !== false) fails.push("activation-review autoTrade not false");
  if (ar.data?.ready === true) fails.push("activation-review claimed READY");
  if (ar.data?.ldaPass !== false) fails.push("activation-review ldaPass");
  if (ar.data?.nationalGraph !== false) fails.push("activation-review nationalGraph");
  if (ar.data?.causalQuery !== false) fails.push("activation-review causalQuery");
  if (ar.data?.seedsComplete !== 0) fails.push("activation-review seedsComplete");
  if (ar.data?.roles200Stabilized !== false) fails.push("activation-review 200 roles");
  if (ar.data?.computeEnabled !== false) fails.push("activation-review compute");
  if (ar.data?.autoDecide !== false) fails.push("activation-review autoDecide");
  if (ar.data?.wave !== "REFUSED") fails.push("activation-review wave not REFUSED");
  if (ar.data?.health?.layersUnlocked !== 0) fails.push("activation-review unlocked layers");
  if (ar.data?.layers?.find((c) => c.id === "Layer.LDA")?.result !== "REFUSED") fails.push("activation-review LDA");
  if (ar.data?.domains?.find((d) => d.id === "Domain.hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("activation-review hospitality");
  }
  if (ar.data?.next?.find((c) => c.id === "Next.liveFeeds")?.result !== "PREPARED_DISABLED") {
    fails.push("activation-review liveFeeds");
  }
  if (ar.data?.nextWave?.liveFeeds?.siem_feed?.enabled !== false) fails.push("activation-review siem enabled");
  if (ar.data?.nextWave?.autoAudit?.autoApply !== false) fails.push("activation-review autoAudit");
  if (pro.data && !("enterprisePrep" in (pro.data as object))) fails.push("professional missing enterprisePrep");
  const ent = (await get("/v1/ecl/professional/enterprise-prep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      liveIngestion?: boolean;
      durableLedger?: boolean;
      crossDomainEngine?: boolean;
      allowPnLPropagation?: boolean;
      autoDecide?: boolean;
      wave?: string;
      scenarios?: Array<{ id?: string; result?: string }>;
      ledger?: Array<{ id?: string; result?: string }>;
      live?: Array<{ id?: string; result?: string }>;
      liveFeeds?: { siem_feed?: { enabled?: boolean; certified?: boolean } };
      health?: { liveIngestion?: number; durableStreams?: number };
    };
  };
  if (ent.persisted !== false) fails.push("enterprise-prep persisted not false");
  if (ent.autoTrade !== false) fails.push("enterprise-prep autoTrade not false");
  if (ent.data?.ready === true) fails.push("enterprise-prep claimed READY");
  if (ent.data?.liveIngestion !== false) fails.push("enterprise-prep liveIngestion");
  if (ent.data?.durableLedger !== false) fails.push("enterprise-prep durableLedger");
  if (ent.data?.crossDomainEngine !== false) fails.push("enterprise-prep scenario engine");
  if (ent.data?.allowPnLPropagation !== false) fails.push("enterprise-prep pnl prop");
  if (ent.data?.autoDecide !== false) fails.push("enterprise-prep autoDecide");
  if (ent.data?.wave !== "REFUSED") fails.push("enterprise-prep wave not REFUSED");
  if (ent.data?.health?.liveIngestion !== 0) fails.push("enterprise-prep live count");
  if (ent.data?.health?.durableStreams !== 0) fails.push("enterprise-prep durable streams");
  if (ent.data?.scenarios?.find((c) => c.id === "Scenario.icu_overload_impacts_supplychain")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("enterprise-prep icu scenario");
  }
  if (ent.data?.ledger?.find((c) => c.id === "Ledger.enableDurable")?.result !== "REFUSED") {
    fails.push("enterprise-prep ledger enable");
  }
  if (ent.data?.live?.find((c) => c.id === "Feed.enableLiveIngestion")?.result !== "REFUSED") {
    fails.push("enterprise-prep live ingestion");
  }
  if (ent.data?.liveFeeds?.siem_feed?.enabled !== false) fails.push("enterprise-prep siem enabled");
  if (ent.data?.liveFeeds?.siem_feed?.certified !== false) fails.push("enterprise-prep siem certified");
  if (pro.data && !("automationPrep" in (pro.data as object))) fails.push("professional missing automationPrep");
  const auto = (await get("/v1/ecl/professional/automation-prep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      autoAudit?: boolean;
      autoLimits?: boolean;
      autoScenarios?: boolean;
      autoDecide?: boolean;
      continuousAudit?: boolean;
      wave?: string;
      audit?: Array<{ id?: string; result?: string }>;
      limits?: Array<{ id?: string; result?: string }>;
      scenarios?: Array<{ id?: string; result?: string }>;
      next?: Array<{ id?: string; result?: string }>;
      health?: { autoActions?: number; accountsFrozen?: number; paymentsHeld?: number; scenariosGenerated?: number };
    };
  };
  if (auto.persisted !== false) fails.push("automation-prep persisted not false");
  if (auto.autoTrade !== false) fails.push("automation-prep autoTrade not false");
  if (auto.data?.ready === true) fails.push("automation-prep claimed READY");
  if (auto.data?.autoAudit !== false) fails.push("automation-prep autoAudit");
  if (auto.data?.autoLimits !== false) fails.push("automation-prep autoLimits");
  if (auto.data?.autoScenarios !== false) fails.push("automation-prep autoScenarios");
  if (auto.data?.autoDecide !== false) fails.push("automation-prep autoDecide");
  if (auto.data?.continuousAudit !== false) fails.push("automation-prep continuousAudit");
  if (auto.data?.wave !== "REFUSED") fails.push("automation-prep wave not REFUSED");
  if (auto.data?.health?.autoActions !== 0) fails.push("automation-prep autoActions");
  if (auto.data?.health?.accountsFrozen !== 0) fails.push("automation-prep accountsFrozen");
  if (auto.data?.health?.paymentsHeld !== 0) fails.push("automation-prep paymentsHeld");
  if (auto.data?.health?.scenariosGenerated !== 0) fails.push("automation-prep scenariosGenerated");
  if (auto.data?.audit?.find((c) => c.id === "Audit.engine")?.result !== "REFUSED") fails.push("automation-prep audit engine");
  if (auto.data?.limits?.find((c) => c.id === "Limit.cyber_incident_tolerance")?.result !== "REFUSED") {
    fails.push("automation-prep cyber freeze");
  }
  if (auto.data?.scenarios?.find((c) => c.id === "ScenarioGen.hospitality_demand_to_finance_scenario")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("automation-prep hospitality scenario");
  }
  if (auto.data?.next?.find((c) => c.id === "Next.humanInTheLoop")?.result !== "ANALOG_CONTRACT") {
    fails.push("automation-prep HITL");
  }
  if (pro.data && !("visibilityPrep" in (pro.data as object))) fails.push("professional missing visibilityPrep");
  const vis = (await get("/v1/ecl/professional/visibility-prep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      gradual?: boolean;
      analogToDigitalHints?: boolean;
      digitalReadyMarkers?: boolean;
      showDomainProgress?: boolean;
      autoAudit?: boolean;
      autoLimits?: boolean;
      autoScenarios?: boolean;
      autoDecide?: boolean;
      wave?: string;
      visibility?: Array<{ id?: string; result?: string }>;
      engines?: Array<{ id?: string; result?: string }>;
      next?: Array<{ id?: string; result?: string }>;
      domains?: Array<{ id?: string; result?: string; enable?: boolean; digitalReady?: boolean; progressBar?: boolean }>;
      health?: { enginesReady?: number; digitalReadyMarkers?: number; progressBarsToEnable?: number };
    };
  };
  if (vis.persisted !== false) fails.push("visibility-prep persisted not false");
  if (vis.autoTrade !== false) fails.push("visibility-prep autoTrade not false");
  if (vis.data?.ready === true) fails.push("visibility-prep claimed READY");
  if (vis.data?.gradual !== false) fails.push("visibility-prep gradual");
  if (vis.data?.analogToDigitalHints !== false) fails.push("visibility-prep analogToDigital");
  if (vis.data?.digitalReadyMarkers !== false) fails.push("visibility-prep digitalReadyMarkers");
  if (vis.data?.showDomainProgress !== false) fails.push("visibility-prep domainProgressBars");
  if (vis.data?.autoAudit !== false) fails.push("visibility-prep autoAudit");
  if (vis.data?.autoLimits !== false) fails.push("visibility-prep autoLimits");
  if (vis.data?.autoScenarios !== false) fails.push("visibility-prep autoScenarios");
  if (vis.data?.autoDecide !== false) fails.push("visibility-prep autoDecide");
  if (vis.data?.wave !== "REFUSED") fails.push("visibility-prep wave not REFUSED");
  if (vis.data?.health?.enginesReady !== 0) fails.push("visibility-prep enginesReady");
  if (vis.data?.health?.digitalReadyMarkers !== 0) fails.push("visibility-prep markers");
  if (vis.data?.health?.progressBarsToEnable !== 0) fails.push("visibility-prep progress bars");
  if (vis.data?.visibility?.find((c) => c.id === "Visibility.engine")?.result !== "REFUSED") {
    fails.push("visibility-prep engine");
  }
  if (vis.data?.engines?.find((c) => c.id === "Engine.autoAudit.ready")?.result !== "REFUSED") {
    fails.push("visibility-prep audit ready");
  }
  if (vis.data?.domains?.find((d) => d.id === "hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("visibility-prep hospitality");
  }
  if (vis.data?.domains?.some((d) => d.enable === true || d.digitalReady === true || d.progressBar === true)) {
    fails.push("visibility-prep domain enable theater");
  }
  if (vis.data?.next?.find((c) => c.id === "Next.causalPathPreview")?.result !== "REFUSED") {
    fails.push("visibility-prep causal preview");
  }
  if (pro.data && !("visibilityActivation" in (pro.data as object))) fails.push("professional missing visibilityActivation");
  const va = (await get("/v1/ecl/professional/visibility-activation")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      visibilityPrepWave?: string;
      passGranted?: boolean;
      governanceApproved?: boolean;
      enginesDeclaredReady?: boolean;
      kgDigitalReady?: boolean;
      kgCausalReady?: boolean;
      gradual?: boolean;
      autoAudit?: boolean;
      autoDecide?: boolean;
      episodes?: Array<{ id?: string; result?: string }>;
      domainProgress?: { hospitality?: { applied?: boolean; result?: string } };
      cockpitLinks?: { autoAudit?: { live?: boolean } };
      health?: { episodesPassed?: number; passGranted?: number; fail?: number };
    };
  };
  if (va.persisted !== false) fails.push("visibility-activation persisted not false");
  if (va.autoTrade !== false) fails.push("visibility-activation autoTrade not false");
  if (va.data?.ready === true) fails.push("visibility-activation claimed READY");
  if (va.data?.wave !== "REFUSED") fails.push("visibility-activation wave not REFUSED");
  if (va.data?.visibilityPrepWave !== "REFUSED") fails.push("visibility-activation flipped prep");
  if (va.data?.passGranted !== false) fails.push("visibility-activation passGranted");
  if (va.data?.governanceApproved !== false) fails.push("visibility-activation governance");
  if (va.data?.enginesDeclaredReady !== false) fails.push("visibility-activation engines ready");
  if (va.data?.kgDigitalReady !== false) fails.push("visibility-activation kg digital");
  if (va.data?.kgCausalReady !== false) fails.push("visibility-activation kg causal");
  if (va.data?.gradual !== false) fails.push("visibility-activation gradual");
  if (va.data?.autoAudit !== false) fails.push("visibility-activation autoAudit");
  if (va.data?.autoDecide !== false) fails.push("visibility-activation autoDecide");
  if (va.data?.health?.episodesPassed !== 0) fails.push("visibility-activation episodesPassed");
  if (va.data?.health?.passGranted !== 0) fails.push("visibility-activation health pass");
  if (va.data?.health?.fail !== 0) fails.push("visibility-activation fail count");
  if (va.data?.episodes?.find((c) => c.id === "Episode.8.requestVisibilityWavePass")?.result !== "REFUSED") {
    fails.push("visibility-activation episode 8");
  }
  if (va.data?.domainProgress?.hospitality?.applied !== false) fails.push("visibility-activation hospitality applied");
  if (va.data?.domainProgress?.hospitality?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("visibility-activation hospitality progress");
  }
  if (va.data?.cockpitLinks?.autoAudit?.live !== false) fails.push("visibility-activation live panel link");
  if (pro.data && !("visibilityDeep" in (pro.data as object))) fails.push("professional missing visibilityDeep");
  const vd = (await get("/v1/ecl/professional/visibility-deep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      visibilityActivationWave?: string;
      visibilityPrepWave?: string;
      passGranted?: boolean;
      deepGovernanceApproved?: boolean;
      engineSpecsValidated?: boolean;
      domainResearchDeep?: boolean;
      kgCausalReady?: boolean;
      gradual?: boolean;
      cockpitBindingApproved?: boolean;
      autoDecide?: boolean;
      episodes?: Array<{ id?: string; result?: string }>;
      health?: { episodesPassed?: number; passGranted?: number; fail?: number; deepStampsApplied?: number };
    };
  };
  if (vd.persisted !== false) fails.push("visibility-deep persisted not false");
  if (vd.autoTrade !== false) fails.push("visibility-deep autoTrade not false");
  if (vd.data?.ready === true) fails.push("visibility-deep claimed READY");
  if (vd.data?.wave !== "REFUSED") fails.push("visibility-deep wave not REFUSED");
  if (vd.data?.visibilityActivationWave !== "REFUSED") fails.push("visibility-deep flipped activation");
  if (vd.data?.visibilityPrepWave !== "REFUSED") fails.push("visibility-deep flipped prep");
  if (vd.data?.passGranted !== false) fails.push("visibility-deep passGranted");
  if (vd.data?.deepGovernanceApproved !== false) fails.push("visibility-deep governance");
  if (vd.data?.engineSpecsValidated !== false) fails.push("visibility-deep specs");
  if (vd.data?.domainResearchDeep !== false) fails.push("visibility-deep domain research");
  if (vd.data?.kgCausalReady !== false) fails.push("visibility-deep causal");
  if (vd.data?.gradual !== false) fails.push("visibility-deep gradual");
  if (vd.data?.cockpitBindingApproved !== false) fails.push("visibility-deep cockpit binding");
  if (vd.data?.autoDecide !== false) fails.push("visibility-deep autoDecide");
  if (vd.data?.health?.episodesPassed !== 0) fails.push("visibility-deep episodesPassed");
  if (vd.data?.health?.passGranted !== 0) fails.push("visibility-deep health pass");
  if (vd.data?.health?.fail !== 0) fails.push("visibility-deep fail count");
  if (vd.data?.health?.deepStampsApplied !== 0) fails.push("visibility-deep stamps");
  if (vd.data?.episodes?.find((c) => c.id === "Episode.8.flipVisibilityActivation")?.result !== "REFUSED") {
    fails.push("visibility-deep episode 8");
  }
  if (vd.data?.episodes?.find((c) => c.id === "Episode.3.validateDomainResearchDeep")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("visibility-deep hospitality research");
  }
  if (pro.data && !("explainabilityPrep" in (pro.data as object))) fails.push("professional missing explainabilityPrep");
  const ex = (await get("/v1/ecl/professional/explainability-prep")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      showCausalPaths?: boolean;
      unifiedExplainBus?: boolean;
      secondReviewFlow?: boolean;
      autoAudit?: boolean;
      autoDecide?: boolean;
      episodes?: Array<{ id?: string; result?: string }>;
      health?: { explainPanelsLive?: number; causalPathsShown?: number; unifiedBusEnabled?: number; autoActionsExplained?: number; fail?: number };
    };
  };
  if (ex.persisted !== false) fails.push("explainability-prep persisted not false");
  if (ex.autoTrade !== false) fails.push("explainability-prep autoTrade not false");
  if (ex.data?.ready === true) fails.push("explainability-prep claimed READY");
  if (ex.data?.wave !== "REFUSED") fails.push("explainability-prep wave not REFUSED");
  if (ex.data?.showCausalPaths !== false) fails.push("explainability-prep causalPaths");
  if (ex.data?.unifiedExplainBus !== false) fails.push("explainability-prep unifiedBus");
  if (ex.data?.secondReviewFlow !== false) fails.push("explainability-prep secondReview");
  if (ex.data?.autoAudit !== false) fails.push("explainability-prep autoAudit");
  if (ex.data?.autoDecide !== false) fails.push("explainability-prep autoDecide");
  if (ex.data?.health?.fail !== 0) fails.push("explainability-prep fail count");
  if (ex.data?.health?.explainPanelsLive !== 0) fails.push("explainability-prep panels");
  if (ex.data?.health?.causalPathsShown !== 0) fails.push("explainability-prep paths");
  if (ex.data?.health?.unifiedBusEnabled !== 0) fails.push("explainability-prep bus");
  if (ex.data?.health?.autoActionsExplained !== 0) fails.push("explainability-prep explained");
  if (ex.data?.episodes?.find((c) => c.id === "Episode.4.enableHumanReview")?.result !== "ANALOG_CONTRACT") {
    fails.push("explainability-prep HITL");
  }
  if (ex.data?.episodes?.find((c) => c.id === "Episode.5.enableCausalPreview")?.result !== "REFUSED") {
    fails.push("explainability-prep causal");
  }
  if (ex.data?.episodes?.find((c) => c.id === "Episode.6.addWorkspaceExplainPanels")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("explainability-prep hospitality panels");
  }
  if (pro.data && !("explainVisibility" in (pro.data as object))) fails.push("professional missing explainVisibility");
  const evw = (await get("/v1/ecl/professional/explain-visibility")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      passGranted?: boolean;
      gradual?: boolean;
      showCausalPaths?: boolean;
      unifiedExplainBus?: boolean;
      builds?: {
        explainabilityLayer?: { result?: string; applied?: boolean };
        humanReviewFlow?: { result?: string };
        causalPreviewEngine?: { result?: string };
        workspaceExplainPanels?: { result?: string };
        visibilityFlip?: { result?: string; applied?: boolean };
        gradualMode?: { result?: string };
      };
      domainExplainButtons?: Array<{ id?: string; live?: boolean; result?: string }>;
      health?: { applied?: number; passGranted?: number; fail?: number };
    };
  };
  if (evw.persisted !== false) fails.push("explain-visibility persisted not false");
  if (evw.autoTrade !== false) fails.push("explain-visibility autoTrade not false");
  if (evw.data?.ready === true) fails.push("explain-visibility claimed READY");
  if (evw.data?.wave !== "REFUSED") fails.push("explain-visibility wave not REFUSED");
  if (evw.data?.passGranted !== false) fails.push("explain-visibility passGranted");
  if (evw.data?.gradual !== false) fails.push("explain-visibility gradual");
  if (evw.data?.showCausalPaths !== false) fails.push("explain-visibility causalPaths");
  if (evw.data?.unifiedExplainBus !== false) fails.push("explain-visibility bus");
  if (evw.data?.health?.applied !== 0) fails.push("explain-visibility applied");
  if (evw.data?.health?.passGranted !== 0) fails.push("explain-visibility health pass");
  if (evw.data?.health?.fail !== 0) fails.push("explain-visibility fail");
  if (evw.data?.builds?.explainabilityLayer?.result !== "REFUSED") fails.push("explain-visibility layer");
  if (evw.data?.builds?.humanReviewFlow?.result !== "ANALOG_CONTRACT") fails.push("explain-visibility HITL");
  if (evw.data?.builds?.causalPreviewEngine?.result !== "REFUSED") fails.push("explain-visibility causal");
  if (evw.data?.builds?.workspaceExplainPanels?.result !== "SKIPPED_RESEARCH_REQUIRED") fails.push("explain-visibility panels");
  if (evw.data?.builds?.visibilityFlip?.result !== "REFUSED") fails.push("explain-visibility flip");
  if (evw.data?.builds?.visibilityFlip?.applied !== false) fails.push("explain-visibility flip applied");
  if (evw.data?.builds?.gradualMode?.result !== "REFUSED") fails.push("explain-visibility gradual build");
  if (evw.data?.domainExplainButtons?.some((d) => d.live === true)) fails.push("explain-visibility live domain button");
  if (evw.data?.domainExplainButtons?.find((d) => d.id === "hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("explain-visibility hospitality button");
  }
  const vaAfter = (await get("/v1/ecl/professional/visibility-activation")) as {
    data?: { wave?: string; passGranted?: boolean; gradual?: boolean };
  };
  if (vaAfter.data?.wave !== "REFUSED") fails.push("visibility-activation flipped after explain-visibility");
  if (vaAfter.data?.passGranted !== false) fails.push("visibility-activation passGranted after explain-visibility");
  if (vaAfter.data?.gradual !== false) fails.push("visibility-activation gradual after explain-visibility");
  if (pro.data && !("digitalWorkspaceCompute" in (pro.data as object))) fails.push("professional missing digitalWorkspaceCompute");
  const dwc = (await get("/v1/ecl/professional/digital-workspace-compute")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      nationalGraph?: boolean;
      showCausalPaths?: boolean;
      kgStatus?: string;
      kgDigitalReady?: boolean;
      computeMode?: string;
      secondShell?: boolean;
      inventedRoles?: boolean;
      builds?: {
        digitalKG?: { result?: string; applied?: boolean };
        domainWorkspaces?: { result?: string; workspaces?: Array<{ id?: string; live?: boolean; deskCreated?: boolean; result?: string }> };
        cockpitCompute?: { result?: string };
      };
      health?: { applied?: number; desksCreated?: number; fail?: number; computeEnabled?: number };
    };
  };
  if (dwc.persisted !== false) fails.push("digital-workspace-compute persisted not false");
  if (dwc.autoTrade !== false) fails.push("digital-workspace-compute autoTrade not false");
  if (dwc.data?.ready === true) fails.push("digital-workspace-compute claimed READY");
  if (dwc.data?.wave !== "REFUSED") fails.push("digital-workspace-compute wave not REFUSED");
  if (dwc.data?.nationalGraph !== false) fails.push("digital-workspace-compute nationalGraph");
  if (dwc.data?.showCausalPaths !== false) fails.push("digital-workspace-compute causalPaths");
  if (dwc.data?.kgStatus !== "ANALOG_OVERLAY") fails.push("digital-workspace-compute kgStatus");
  if (dwc.data?.kgDigitalReady !== false) fails.push("digital-workspace-compute kgDigitalReady");
  if (dwc.data?.computeMode !== "INSPECT_ONLY") fails.push("digital-workspace-compute computeMode");
  if (dwc.data?.secondShell !== false) fails.push("digital-workspace-compute secondShell");
  if (dwc.data?.inventedRoles !== false) fails.push("digital-workspace-compute inventedRoles");
  if (dwc.data?.health?.applied !== 0) fails.push("digital-workspace-compute applied");
  if (dwc.data?.health?.desksCreated !== 0) fails.push("digital-workspace-compute desks");
  if (dwc.data?.health?.fail !== 0) fails.push("digital-workspace-compute fail");
  if (dwc.data?.health?.computeEnabled !== 0) fails.push("digital-workspace-compute computeEnabled");
  if (dwc.data?.builds?.digitalKG?.result !== "REFUSED") fails.push("digital-workspace-compute KG");
  if (dwc.data?.builds?.digitalKG?.applied !== false) fails.push("digital-workspace-compute KG applied");
  if (dwc.data?.builds?.domainWorkspaces?.result !== "SKIPPED_RESEARCH_REQUIRED") fails.push("digital-workspace-compute desks result");
  if (dwc.data?.builds?.cockpitCompute?.result !== "REFUSED") fails.push("digital-workspace-compute COMPUTE");
  if (dwc.data?.builds?.domainWorkspaces?.workspaces?.some((w) => w.live === true || w.deskCreated === true)) {
    fails.push("digital-workspace-compute live desk");
  }
  if (dwc.data?.builds?.domainWorkspaces?.workspaces?.find((w) => w.id === "hospitality")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("digital-workspace-compute hospitality desk");
  }
  const daAfter = (await get("/v1/ecl/professional/digital-activation")) as { data?: { nationalGraph?: boolean; wave?: string } };
  if (daAfter.data?.nationalGraph !== false) fails.push("digital-activation nationalGraph after KG wave");
  if (daAfter.data?.wave !== "REFUSED") fails.push("digital-activation flipped after KG wave");
  if (pro.data && !("activationPass" in (pro.data as object))) fails.push("professional missing activationPass");
  const ap = (await get("/v1/ecl/professional/activation-pass")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      ready?: boolean;
      wave?: string;
      applied?: string;
      requestedApplied?: string;
      passGranted?: boolean;
      gradual?: boolean;
      persisted?: boolean;
      steps?: {
        engines?: { result?: string };
        humanReview?: { result?: string; sealed?: boolean; evidence?: string };
        workspaces?: { result?: string };
        cockpitCompute?: { result?: string };
        systemReady?: { result?: string; sealed?: boolean };
      };
      health?: { applied?: number; sealed?: number; fail?: number; readyStamps?: number; enginesActivated?: number };
    };
  };
  if (ap.persisted !== false) fails.push("activation-pass persisted not false");
  if (ap.autoTrade !== false) fails.push("activation-pass autoTrade not false");
  if (ap.data?.ready === true) fails.push("activation-pass claimed READY");
  if (ap.data?.wave !== "REFUSED") fails.push("activation-pass wave not REFUSED");
  if (ap.data?.applied !== "NONE") fails.push("activation-pass applied not NONE");
  if (ap.data?.requestedApplied !== "ULTIMATE_MASTER") fails.push("activation-pass missing ULTIMATE_MASTER request stamp");
  if (ap.data?.passGranted !== false) fails.push("activation-pass passGranted");
  if (ap.data?.gradual !== false) fails.push("activation-pass gradual");
  if (ap.data?.persisted !== false) fails.push("activation-pass data persisted");
  if (ap.data?.health?.applied !== 0) fails.push("activation-pass health applied");
  if (ap.data?.health?.sealed !== 0) fails.push("activation-pass sealed");
  if (ap.data?.health?.fail !== 0) fails.push("activation-pass fail");
  if (ap.data?.health?.readyStamps !== 0) fails.push("activation-pass readyStamps");
  if (ap.data?.health?.enginesActivated !== 0) fails.push("activation-pass engines");
  if (ap.data?.steps?.engines?.result !== "REFUSED") fails.push("activation-pass engines step");
  if (ap.data?.steps?.humanReview?.result !== "ANALOG_CONTRACT") fails.push("activation-pass HITL");
  if (ap.data?.steps?.humanReview?.sealed === true) fails.push("activation-pass HITL sealed");
  if (!String(ap.data?.steps?.humanReview?.evidence || "").includes("persistApplied=false")) {
    fails.push("activation-pass HITL persistApplied");
  }
  if (!String(ap.data?.steps?.humanReview?.evidence || "").includes("hitlMode=ANALOG_CONTRACT")) {
    fails.push("activation-pass HITL digital stamp");
  }
  if (ap.data?.steps?.workspaces?.result !== "SKIPPED_RESEARCH_REQUIRED") fails.push("activation-pass desks");
  if (ap.data?.steps?.cockpitCompute?.result !== "REFUSED") fails.push("activation-pass COMPUTE");
  if (ap.data?.steps?.systemReady?.result !== "REFUSED") fails.push("activation-pass markReady");
  if (ap.data?.steps?.systemReady?.sealed === true) fails.push("activation-pass system sealed");
  const phase = (await get("/v1/ecl/professional/phase-core")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoAudit?: boolean;
      executed?: boolean;
      filled?: boolean;
      daemonInBoot?: boolean;
      parallelTree?: boolean;
      beta?: boolean;
      computeMode?: string;
      health?: { executed?: number; desksCreated?: number; daemonStarted?: number; applied?: number; fail?: number; contractRows?: number; blueprintsWritten?: number };
      p7?: Array<{ id?: string; result?: string }>;
      constraints?: Array<{ id?: string; result?: string }>;
      contracts?: { filesWritten?: number; deepseek?: unknown[]; wave?: string };
    };
  };
  if (phase.persisted !== false) fails.push("phase-core persisted not false");
  if (phase.autoTrade !== false) fails.push("phase-core autoTrade not false");
  if (phase.data?.wave !== "REFUSED") fails.push("phase-core wave not REFUSED");
  if (phase.data?.ready === true) fails.push("phase-core claimed READY");
  if (phase.data?.autoAudit !== false) fails.push("phase-core autoAudit");
  if (phase.data?.executed !== false) fails.push("phase-core executed");
  if (phase.data?.filled !== false) fails.push("phase-core filled");
  if (phase.data?.daemonInBoot !== false) fails.push("phase-core daemonInBoot");
  if (phase.data?.parallelTree !== false) fails.push("phase-core parallelTree");
  if (phase.data?.beta !== false) fails.push("phase-core beta");
  if (phase.data?.computeMode !== "INSPECT_ONLY") fails.push("phase-core computeMode");
  if (phase.data?.health?.executed !== 0) fails.push("phase-core health executed");
  if (phase.data?.health?.desksCreated !== 0) fails.push("phase-core desks");
  if (phase.data?.health?.daemonStarted !== 0) fails.push("phase-core daemonStarted");
  if (phase.data?.health?.applied !== 0) fails.push("phase-core applied");
  if (phase.data?.health?.fail !== 0) fails.push("phase-core fail");
  if (phase.data?.p7?.find((c) => c.id === "P7-80.phiSandbox")?.result !== "SKIPPED_RESEARCH_REQUIRED") {
    fails.push("phase-core PHI sandbox");
  }
  if (phase.data?.constraints?.find((c) => c.id === "X.sciOsX10Tree")?.result !== "REFUSED") {
    fails.push("phase-core sci-os-x10 tree");
  }
  if (phase.data?.health?.contractRows !== 100) fails.push("phase-core contractRows");
  if (phase.data?.health?.blueprintsWritten !== 0) fails.push("phase-core blueprintsWritten");
  if (phase.data?.contracts?.filesWritten !== 0) fails.push("phase-core contracts filesWritten");
  if (!Array.isArray(phase.data?.contracts?.deepseek) || phase.data.contracts.deepseek.length !== 100) {
    fails.push("phase-core contracts deepseek");
  }
  const phaseBp = (await get("/v1/ecl/professional/phase-core/blueprints")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      filesWritten?: number;
      parallelTree?: boolean;
      deepseek?: Array<{ n?: number; result?: string; applied?: boolean }>;
      residual81to100?: unknown[];
    };
  };
  if (phaseBp.persisted !== false) fails.push("phase-core blueprints persisted not false");
  if (phaseBp.autoTrade !== false) fails.push("phase-core blueprints autoTrade");
  if (phaseBp.data?.wave !== "REFUSED") fails.push("phase-core blueprints wave");
  if (phaseBp.data?.ready === true) fails.push("phase-core blueprints READY");
  if (phaseBp.data?.filesWritten !== 0) fails.push("phase-core blueprints filesWritten");
  if (phaseBp.data?.parallelTree !== false) fails.push("phase-core blueprints parallelTree");
  if (phaseBp.data?.deepseek?.length !== 100) fails.push("phase-core blueprints deepseek length");
  if (phaseBp.data?.deepseek?.some((r) => r.applied === true)) fails.push("phase-core blueprints applied");
  if (phaseBp.data?.deepseek?.find((r) => r.n === 61)?.result !== "REFUSED") fails.push("phase-core Electron not REFUSED");
  if (!Array.isArray(phaseBp.data?.residual81to100) || phaseBp.data.residual81to100.length !== 20) {
    fails.push("phase-core residual plans");
  }
  const auditCore = (await get("/v1/ecl/professional/audit-engine-core")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoAudit?: boolean;
      continuous?: boolean;
      freeze?: boolean;
      loopStarted?: boolean;
      missingRiskScore?: string;
      health?: { loopsStarted?: number; accountsFrozen?: number; autoBlocks?: number; fail?: number };
    };
  };
  if (auditCore.persisted !== false) fails.push("audit-engine-core persisted not false");
  if (auditCore.autoTrade !== false) fails.push("audit-engine-core autoTrade");
  if (auditCore.data?.wave !== "REFUSED") fails.push("audit-engine-core wave");
  if (auditCore.data?.ready === true) fails.push("audit-engine-core READY");
  if (auditCore.data?.autoAudit !== false) fails.push("audit-engine-core autoAudit");
  if (auditCore.data?.continuous !== false) fails.push("audit-engine-core continuous");
  if (auditCore.data?.freeze !== false) fails.push("audit-engine-core freeze");
  if (auditCore.data?.loopStarted !== false) fails.push("audit-engine-core loopStarted");
  if (auditCore.data?.missingRiskScore !== "UNKNOWN") fails.push("audit-engine-core riskScore coerced");
  if (auditCore.data?.health?.loopsStarted !== 0) fails.push("audit-engine-core loopsStarted");
  if (auditCore.data?.health?.accountsFrozen !== 0) fails.push("audit-engine-core frozen");
  if (auditCore.data?.health?.autoBlocks !== 0) fails.push("audit-engine-core autoBlocks");
  if (auditCore.data?.health?.fail !== 0) fails.push("audit-engine-core fail");
  const limitCore = (await get("/v1/ecl/professional/limit-engine-core")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      autoLimits?: boolean;
      freeze?: boolean;
      loopStarted?: boolean;
      health?: { loopsStarted?: number; autoBlocks?: number; fail?: number };
    };
  };
  if (limitCore.persisted !== false) fails.push("limit-engine-core persisted not false");
  if (limitCore.autoTrade !== false) fails.push("limit-engine-core autoTrade");
  if (limitCore.data?.wave !== "REFUSED") fails.push("limit-engine-core wave");
  if (limitCore.data?.ready === true) fails.push("limit-engine-core READY");
  if (limitCore.data?.autoLimits !== false) fails.push("limit-engine-core autoLimits");
  if (limitCore.data?.freeze !== false) fails.push("limit-engine-core freeze");
  if (limitCore.data?.loopStarted !== false) fails.push("limit-engine-core loopStarted");
  if (limitCore.data?.health?.loopsStarted !== 0) fails.push("limit-engine-core loopsStarted");
  if (limitCore.data?.health?.autoBlocks !== 0) fails.push("limit-engine-core autoBlocks");
  const ledgerCore = (await get("/v1/ecl/professional/ledger-core")) as {
    persisted?: boolean;
    autoTrade?: boolean;
    data?: {
      wave?: string;
      ready?: boolean;
      durable?: boolean;
      pgRequired?: boolean;
      parallelTree?: boolean;
      health?: { durableStamps?: number; hotDeletes?: number; fail?: number; megaFiles?: number };
      path?: Array<{ id?: string; result?: string }>;
    };
  };
  if (ledgerCore.persisted !== false) fails.push("ledger-core persisted not false");
  if (ledgerCore.autoTrade !== false) fails.push("ledger-core autoTrade");
  if (ledgerCore.data?.wave !== "REFUSED") fails.push("ledger-core wave");
  if (ledgerCore.data?.ready === true) fails.push("ledger-core READY");
  if (ledgerCore.data?.durable !== false) fails.push("ledger-core durable");
  if (ledgerCore.data?.pgRequired !== false) fails.push("ledger-core pgRequired");
  if (ledgerCore.data?.parallelTree !== false) fails.push("ledger-core parallelTree");
  if (ledgerCore.data?.health?.durableStamps !== 0) fails.push("ledger-core durableStamps");
  if (ledgerCore.data?.health?.hotDeletes !== 0) fails.push("ledger-core hotDeletes");
  if (ledgerCore.data?.health?.fail !== 0) fails.push("ledger-core fail");
  if (ledgerCore.data?.health?.megaFiles !== 0) fails.push("ledger-core megaFiles");
  if (ledgerCore.data?.path?.find((c) => c.id === "LX.sciOsX10File")?.result !== "REFUSED") {
    fails.push("ledger-core sci-os-x10.ts");
  }
  if (ledgerCore.data?.path?.find((c) => c.id === "LX.npmInit")?.result !== "REFUSED") {
    fails.push("ledger-core npm");
  }
  if (ledgerCore.data?.path?.find((c) => c.id === "LX.dockerPostgresBoot")?.result !== "REFUSED") {
    fails.push("ledger-core docker postgres boot");
  }
  const { prop } = await professionalFabricChecks(
    get,
    fails,
    base,
    markets,
    auditBeforeDigital
  );
  server.close();
  const out = {
    ok: fails.length === 0,
    fails,
    proposalAction: prop.data?.action ?? null,
    autoTrade: false as const,
    label: "ALPHA_NON_PRODUCTION" as const,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(fails.length ? 1 : 0);
});
