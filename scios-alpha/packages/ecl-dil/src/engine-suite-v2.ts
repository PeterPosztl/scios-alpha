/**
 * BUILD_SUITE_V2 — in-memory ledger + optional sci_ecl DAO + preview books + registry KG.
 * durable=true only after DAO INSERT. Missing riskScore is not 0. preview PnL ≠ realized.
 * autoTrade=false. Not READY. ALPHA_NON_PRODUCTION. SIMULATION_ONLY.
 */
import { DIGITAL_WORKSPACE_COMPUTE_HOOKS } from "./digital-workspace-compute.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { ENGINE_SUITE_HOOKS } from "./engine-suite.js";
import type { AuditLimitInput } from "./engine-audit.js";
import type { EclLedgerDao } from "./ecl-ledger-dao.js";

export type LedgerKind = "DECISION" | "EXECUTION_PREVIEW";

export type LedgerEntry = {
  ts: string;
  kind: LedgerKind;
  instrumentId: string;
  payload: Record<string, unknown>;
  analog: true;
  durable: boolean;
};

export type KgNodeV2 = {
  id: string;
  type: string;
  analog: true;
  live: false;
  fixture?: boolean;
};

export type KgEdgeV2 = {
  from: string;
  to: string;
  relation: string;
  analog: true;
  live: false;
};

export const BUILD_SUITE_V2_HOOKS = {
  schema: "sci-os-build-suite/v2" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  suite: "BUILD_SUITE_V2" as const,
  analog: true as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  executed: false as const,
  persisted: false as const,
  durable: false as const,
  preview: true as const,
  realized: false as const,
  nationalGraph: false as const,
  causalQueryEngine: "ABSENT" as const,
  computeMode: "ANALOG_COMPOSE" as const,
  inspectComputeMode: "INSPECT_ONLY" as const,
  executionMode: "SIMULATION_ONLY" as const,
  note: "In-memory ledger váz. Not a durable enterprise ledger. Preview notional ≠ realized PnL. Not READY.",
};

type CockpitInput = AuditLimitInput & {
  horizonDays?: number;
  price?: number;
  dailyLoss?: number;
  exposure?: number;
  leverage?: number;
};

function stamp() {
  return {
    ...BUILD_SUITE_V2_HOOKS,
    inspectComputeMode: DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode,
    nationalGraph: OS_BLUEPRINT_HOOKS.nationalGraph,
    v1Suite: ENGINE_SUITE_HOOKS.suite,
  };
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function createBuildSuiteV2(opts: {
  cockpitComputeV1: (input: CockpitInput) => unknown;
  dao?: EclLedgerDao | null;
}) {
  const ledger: LedgerEntry[] = [];
  const kgNodes: KgNodeV2[] = [];
  const kgEdges: KgEdgeV2[] = [];
  const dao = opts.dao ?? null;

  function memoryAppend(kind: LedgerKind, instrumentId: string, payload: Record<string, unknown>, durable: boolean) {
    const entry: LedgerEntry = {
      ts: new Date().toISOString(),
      kind,
      instrumentId,
      payload,
      analog: true,
      durable,
    };
    ledger.unshift(entry);
    if (ledger.length > 500) ledger.pop();
    return entry;
  }

  const api = {
    hooks: BUILD_SUITE_V2_HOOKS,
    inventory() {
      return {
        ...stamp(),
        ledgerSize: ledger.length,
        kgNodes: kgNodes.length,
        kgEdges: kgEdges.length,
        daoBackend: dao?.backend ?? "none",
        livePostgres: dao?.livePostgres === true,
        durable: dao?.connected === true,
        routes: [
          "POST /v1/ecl/engine/ledger/append",
          "GET /v1/ecl/engine/ledger",
          "GET /v1/ecl/engine/pnl-book",
          "GET /v1/ecl/engine/risk-book",
          "POST /v1/ledger/append",
          "GET /v1/ledger",
          "GET /v1/pnl-book",
          "GET /v1/risk-book",
          "POST /v1/ecl/engine/kg/registry",
          "GET /v1/ecl/engine/kg-v2",
          "GET /v1/ecl/engine/evidence-v2",
          "GET /v1/ecl/engine/reporting",
          "POST /v1/ecl/engine/cockpit-compute-v2",
          "GET /v1/ecl/engine/build-v3",
          "GET /v1/ecl/engine/infra",
        ],
      };
    },
    async append(input: { kind?: string; instrumentId?: string; payload?: Record<string, unknown> }) {
      if (input.kind !== "DECISION" && input.kind !== "EXECUTION_PREVIEW") {
        return { ok: false as const, error: "kind_must_be_DECISION_or_EXECUTION_PREVIEW" };
      }
      if (!input.instrumentId || !input.instrumentId.trim()) {
        return { ok: false as const, error: "instrumentId_required" };
      }
      const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
      let durable = false;
      let daoReason: string = "NOT_CONFIGURED";
      if (dao?.connected) {
        const flushed = await dao.append({
          ts: new Date().toISOString(),
          kind: input.kind,
          instrumentId: input.instrumentId.trim(),
          payload,
          analog: true,
        });
        durable = flushed.durable === true;
        daoReason = flushed.reason;
      }
      const entry = memoryAppend(input.kind, input.instrumentId.trim(), payload, durable);
      return {
        ...stamp(),
        ok: true as const,
        engine: "ledger-v1" as const,
        entry,
        ledgerSize: ledger.length,
        durable,
        livePostgres: dao?.livePostgres === true,
        daoBackend: dao?.backend ?? "none",
        daoReason,
      };
    },
    list() {
      return {
        ...stamp(),
        engine: "ledger-v1" as const,
        entries: ledger.slice(),
        ledgerSize: ledger.length,
      };
    },
    pnlBook() {
      const notionalPreviewByInstrument: Record<string, number> = {};
      let skippedUnknown = 0;
      for (const e of ledger) {
        if (e.kind !== "EXECUTION_PREVIEW") continue;
        const size = e.payload.size ?? e.payload.previewSize;
        const price = e.payload.previewFillPrice ?? e.payload.fillPreview;
        if (!finite(size) || !finite(price)) {
          skippedUnknown += 1;
          continue;
        }
        notionalPreviewByInstrument[e.instrumentId] =
          (notionalPreviewByInstrument[e.instrumentId] ?? 0) + size * price;
      }
      return {
        ...stamp(),
        engine: "pnl-book-v1" as const,
        preview: true as const,
        realized: false as const,
        pnlByInstrument: notionalPreviewByInstrument,
        notionalPreviewByInstrument,
        skippedUnknown,
        note: "Preview notional (size × previewFillPrice). preview=true. Not realized PnL. Missing price/size skipped, not treated as 0.",
      };
    },
    riskBook() {
      const riskByInstrument: Record<string, number> = {};
      let skippedUnknown = 0;
      for (const e of ledger) {
        if (e.kind !== "DECISION") continue;
        const riskScore = e.payload.riskScore;
        if (!finite(riskScore)) {
          skippedUnknown += 1;
          continue;
        }
        riskByInstrument[e.instrumentId] = (riskByInstrument[e.instrumentId] ?? 0) + riskScore;
      }
      return {
        ...stamp(),
        engine: "risk-book-v1" as const,
        riskByInstrument,
        skippedUnknown,
        note: "Sum of finite decision riskScores. Missing riskScore is UNKNOWN, not 0.",
      };
    },
    kgRegistryAdd(input: { node?: Partial<KgNodeV2> | null; edges?: Partial<KgEdgeV2>[] | null }) {
      if (input.node && typeof input.node.id === "string" && input.node.id.trim()) {
        kgNodes.push({
          id: input.node.id.trim(),
          type: typeof input.node.type === "string" ? input.node.type : "ENTITY",
          analog: true,
          live: false,
          fixture: input.node.fixture === true,
        });
      }
      if (Array.isArray(input.edges)) {
        for (const e of input.edges) {
          if (!e || typeof e.from !== "string" || typeof e.to !== "string") continue;
          kgEdges.push({
            from: e.from,
            to: e.to,
            relation: typeof e.relation === "string" ? e.relation : "SUPPORTS",
            analog: true,
            live: false,
          });
        }
      }
      return {
        ...stamp(),
        ok: true as const,
        engine: "kg-registry-v2" as const,
        kgNodes: kgNodes.length,
        kgEdges: kgEdges.length,
        nationalGraph: false as const,
      };
    },
    kgV2(instrumentId: string) {
      const edges = kgEdges.filter((e) => e.to === instrumentId || e.from === instrumentId);
      const related = new Set<string>([instrumentId, ...edges.flatMap((e) => [e.from, e.to])]);
      const nodes = kgNodes.filter((n) => related.has(n.id));
      return {
        ...stamp(),
        engine: "kg-engine-v2" as const,
        instrumentId,
        nodes,
        edges,
        status: nodes.length || edges.length ? ("ANALOG_REGISTRY" as const) : ("UNKNOWN" as const),
        nationalGraph: false as const,
        note: "Registry overlay only. Empty registry ⇒ UNKNOWN, not a hardcoded macro:rates graph.",
      };
    },
    evidenceV2(instrumentId: string) {
      const signals = ledger
        .filter((e) => e.instrumentId === instrumentId)
        .map((e) => ({ kind: e.kind, ts: e.ts, analog: true as const, live: false as const }));
      return {
        ...stamp(),
        engine: "evidence-engine-v2" as const,
        instrumentId,
        signals,
        status: signals.length ? ("PARTIAL" as const) : ("UNKNOWN" as const),
        note: "Ledger-derived signals. Empty ≠ padded demo evidence.",
      };
    },
    reporting() {
      return {
        ...stamp(),
        engine: "reporting-v1" as const,
        pnl: api.pnlBook(),
        risk: api.riskBook(),
        ledgerSize: ledger.length,
      };
    },
    async cockpitComputeV2(input: CockpitInput) {
      const composed = opts.cockpitComputeV1(input) as {
        engine?: string;
        decision?: { decision?: string; reason?: unknown };
        execution?: { previewFillPrice?: number | null; previewSize?: number | null; executed?: boolean };
        risk?: { riskScore?: number | null };
      };
      const d1 = await api.append({
        kind: "DECISION",
        instrumentId: input.instrumentId,
        payload: {
          decision: composed.decision?.decision ?? null,
          verdicts: composed.decision?.reason ?? null,
          riskScore: composed.risk?.riskScore ?? null,
        },
      });
      const d2 = await api.append({
        kind: "EXECUTION_PREVIEW",
        instrumentId: input.instrumentId,
        payload: {
          previewFillPrice: composed.execution?.previewFillPrice ?? null,
          size: composed.execution?.previewSize ?? input.size,
          previewSize: composed.execution?.previewSize ?? input.size,
        },
      });
      const durable = d1.ok === true && d1.durable === true && d2.ok === true && d2.durable === true;
      return {
        ...composed,
        ...stamp(),
        engine: "cockpit-compute-v2" as const,
        executed: false as const,
        inspectComputeMode: DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode,
        ledgerSize: ledger.length,
        durable,
        livePostgres: dao?.livePostgres === true,
        note: "V1 compose + ledger append. Preview-only. Does not flip COMPUTE or autoTrade.",
      };
    },
  };

  return api;
}

export type BuildSuiteV2 = ReturnType<typeof createBuildSuiteV2>;
