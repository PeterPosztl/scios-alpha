/**
 * Realistic simulation layer — SIMULATION_ONLY structure over ECL/DIL analogs.
 * Not SSE.3.x Monte Carlo, not CausalEngine.4.x do-calculus, not an affect model, not live feeds.
 * ALPHA_NON_PRODUCTION. No auto-trade. Not READY.
 */

import { SCI_FEED_IDS } from "./feed-registry.js";

export const REALISTIC_SIM_HOOKS = {
  schema: "sci-os-realistic-sim-hooks/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  layerMounted: true as const,
  enabledFull: false as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  autoTrade: false as const,
  persisted: false as const,
  ready: false as const,
  monteCarlo: false as const,
  doCalculus: false as const,
  affectModel: false as const,
  legalCounsel: false as const,
  raft: false as const,
  fullSystemOperation: true as const,
  engines: {
    "WorkflowEngine.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "GW1 VERTICAL_SLICE_STAGES — the only live OS workflow",
      note: "No second workflow-engine HTTP app.",
    },
    "EventBus.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "InMemoryEventBus Wave 0",
      note: "Kafka/NATS ABSENT.",
    },
    "ConsensusEngine.RealisticMode": {
      status: "ABSENT" as const,
      analog: "independent_risk_gate + governance_decision",
      note: "Not Raft/Paxos.",
    },
    "SystemHealth.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "#system dashboard + feed health",
      note: "CORE_READY is not enterprise GO.",
    },
    "AuditEngine.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "ECL/DIL in-memory audit chain",
      note: "GET persisted=false until durable ledger.",
    },
    "Intelligence.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "#dil workspace + feed registry + realistic sim card",
      note: "Simulated Polymarket/Kalshi. Agent proposes; human decides.",
    },
    "Decisions.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "/v1/ai/proposals review → audit only",
      note: "executed=false. autoTrade=false.",
    },
    "Evidence.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "ECL audit + GW1 lineage",
      note: "Not enterprise SIEM.",
    },
    "Reporting.RealisticPnL": {
      status: "PARTIAL" as const,
      analog: "ECL session PnL on in-memory book",
      note: "Weekly/monthly remain UNKNOWN without a durable ledger.",
    },
    "RiskGov.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "ECL guardrail studio",
      note: "Advisory stop. Not a broker kill-switch.",
    },
    "Technical.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "#engineering GW1 JSON + blueprint studios",
      note: "Same Shell. No second cockpit.",
    },
    RiskPropagationEngine: {
      status: "PARTIAL" as const,
      analog: "ECL guardrail + DIL risk scores across simulated markets",
      note: "Propagation is a session graph, not a production risk fabric.",
    },
    CausalGraphEngine: {
      status: "PARTIAL" as const,
      analog: "Typed AFFECTS/REQUIRES/PROVES over simulated feeds + markets",
      note: "Not CausalEngine.4.x. No do-calculus.",
    },
    "CausalEngine.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "Typed AFFECTS over simulated feeds",
      note: "Not do-calculus.",
    },
    "SSE.RealisticTimeline": {
      status: "PARTIAL" as const,
      analog: "24h vs stressed + simulated asOf timeline",
      note: "Not SSE.3.x Monte Carlo.",
    },
    "EmotionalEngine.RealisticMode": {
      status: "ABSENT" as const,
      analog: "UX role presentation only",
      note: "No stakeholder-emotion simulator.",
    },
    "CompetitionEngine.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "Rank simulated markets by |edgeScore|",
      note: "Not a game engine or live tournament.",
    },
    "LegalGuardian.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "GOVERNANCE > AGENT + ECL guardrail",
      note: "Not a licensed legal counsel. Human remains decision maker.",
    },
    "DataFeedEngine.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "13-type registry SIMULATION_ONLY",
      note: "liveCertified=0.",
    },
    "InstrumentAdapterLayer.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "bookIntegrity matched/orphan + simulated OHLC structure",
      note: "Orderbook/depth remain ABSENT as venue tapes.",
    },
    "FeedRegistry.RealisticMode": {
      status: "COMPOSED" as const,
      analog: "GET /v1/ecl/feeds",
      note: "persisted=false.",
    },
    "FeedHealthMonitor.RealisticMode": {
      status: "COMPOSED" as const,
      analog: "registry.health",
      note: "Not venue SLA.",
    },
    "Evidence.RealisticChain": {
      status: "PARTIAL" as const,
      analog: "ECL/DIL audit linked as a session chain",
      note: "Not enterprise SIEM.",
    },
    "Lineage.RealisticMode": {
      status: "PARTIAL" as const,
      analog: "GW1 immutable_lineage + in-memory audit ids",
      note: "No durable hash fabric.",
    },
  },
};

// Nullable by contract: a row whose probability/edge/risk computation failed is
// emitted with those fields null and rowStatus "UNKNOWN". Modelling them as
// merely optional hid the degraded row from every consumer.
type SimRow = {
  market?: { marketId?: string; venue?: string; title?: string; prices?: Record<string, number>; asOf?: string } | null;
  risk?: { riskScore?: number; noNewRisk?: boolean } | null;
  edge?: { edgeScore?: number } | null;
  scenario?: { autoTrade?: boolean; base?: { decision?: string }; stressed?: { decision?: string } } | null;
  rowStatus?: string;
};

type SimAudit = { id?: string; time?: string; kind?: string; reason?: string; marketId?: string; decision?: string };

export function buildRealisticSimulation(input: {
  rows?: SimRow[];
  audit?: SimAudit[];
  guardrail?: { recommendation?: string; breaches?: string[]; dailyLoss?: number };
  session?: { pnl?: number };
  calibration?: { liveStatus?: string; simulatedAdequacy?: string };
  feedIds?: readonly string[];
}) {
  const rows = input.rows || [];
  const audit = (input.audit || []).slice(0, 24);
  const feedIds = input.feedIds || SCI_FEED_IDS;
  const nodes = rows.map((r, i) => {
    const id = r.market?.marketId || `row-${i}`;
    const implied = Number(r.market?.prices?.yes);
    return {
      id,
      venue: r.market?.venue || "UNKNOWN",
      title: r.market?.title || id,
      implied: Number.isFinite(implied) ? implied : null,
      riskScore: r.risk?.riskScore ?? null,
      noNewRisk: r.risk?.noNewRisk === true,
      edgeScore: r.edge?.edgeScore ?? null,
      rowStatus: r.rowStatus || "UNKNOWN",
    };
  });
  const riskEdges = nodes
    .filter((n) => typeof n.riskScore === "number")
    .map((n) => ({ type: "AFFECTS" as const, from: n.id, to: "guardrail", weight: n.riskScore }));
  const causalEdges = [
    ...feedIds.slice(0, 6).map((f) => ({ type: "SUPPORTS" as const, from: f, to: nodes[0]?.id || "book" })),
    ...riskEdges.map((e) => ({ type: "AFFECTS" as const, from: e.from, to: e.to })),
  ];
  const timeline = [
    ...nodes.map((n) => ({
      t: rows.find((r) => r.market?.marketId === n.id)?.market?.asOf || null,
      kind: "market_snapshot",
      id: n.id,
      simulated: true,
    })),
    ...audit.map((a) => ({
      t: a.time || null,
      kind: a.kind || "audit",
      id: a.id || "UNKNOWN",
      decision: a.decision || null,
      simulated: true,
    })),
  ].slice(0, 30);
  const chain = audit.map((a, i) => ({
    id: a.id || `ev-${i}`,
    prev: i > 0 ? audit[i - 1]?.id || null : null,
    kind: a.kind || "UNKNOWN",
    reason: (a.reason || "").slice(0, 160),
  }));
  const ohlc = nodes.slice(0, 3).map((n) => {
    const p = n.implied == null ? 0.5 : n.implied;
    return {
      marketId: n.id,
      source: "simulated_structure",
      live: "ABSENT" as const,
      bars: [p * 0.98, p * 0.99, p, p * 1.01].map((px, i) => ({ i, o: px, h: px * 1.01, l: px * 0.99, c: px })),
    };
  });
  return {
    ...REALISTIC_SIM_HOOKS,
    // After the spread: the hooks carry their own schema id and were silently
    // overwriting this report's identity.
    schema: "sci-os-realistic-sim/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    autoTrade: false as const,
    persisted: false as const,
    unexpectedLive: false as const,
    liveCertified: 0 as const,
    riskPropagation: {
      nodes,
      edges: riskEdges,
      guardrail: input.guardrail?.recommendation || "UNKNOWN",
      breaches: input.guardrail?.breaches || [],
    },
    causalGraph: { nodes: [...feedIds.map((id) => ({ id, kind: "feed" })), ...nodes.map((n) => ({ id: n.id, kind: "market" }))], edges: causalEdges },
    timeline,
    reporting: {
      sessionPnl: input.session?.pnl ?? null,
      dailyLoss: input.guardrail?.dailyLoss ?? null,
      weekly: "UNKNOWN",
      monthly: "UNKNOWN",
    },
    evidenceChain: chain,
    lineage: { events: chain.length, durable: false, live: "UNKNOWN" },
    simulatedStructure: { ohlc, note: "Synthetic bars from implied yes — not a venue OHLC tape." },
    calibration: {
      live: input.calibration?.liveStatus || "UNKNOWN",
      simulated: input.calibration?.simulatedAdequacy || "ADEQUATE_ALPHA",
    },
    os: {
      workflow: "GW1 VERTICAL_SLICE_STAGES",
      eventBus: "InMemoryEventBus",
      consensus: "governance analog",
      raft: false as const,
    },
    competition: {
      ranked: [...nodes]
        .filter((n) => typeof n.edgeScore === "number")
        .sort((a, b) => Math.abs(b.edgeScore || 0) - Math.abs(a.edgeScore || 0))
        .slice(0, 8)
        .map((n, rank) => ({ rank: rank + 1, id: n.id, edgeScore: n.edgeScore, autoTrade: false as const })),
      note: "Opportunity ranking on simulated book. Not a live competition.",
    },
    legalGuardian: {
      autoTrade: false as const,
      requiresHuman: true as const,
      governance: "AGENT → PROPOSAL → HUMAN → DECISION",
      legalCounsel: false as const,
      breaches: input.guardrail?.breaches || [],
      note: "Guardrail + human review. Not a licensed legal opinion.",
    },
    note: "Full-system realistic operation on analogs. Not live markets. Not Monte Carlo. Not do-calculus. No auto-trade. Not READY.",
  };
}
