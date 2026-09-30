/**
 * ECL finance + DIL probability/edge/decision math.
 * ALPHA_NON_PRODUCTION — simulation numbers, not calibrated.
 */
import type { Position, Trade, Bankroll, Horizon, DecisionType, Confidence, EdgeClass } from "./schemas.js";

export function unrealizedPnl(p: Position): number {
  const delta = p.currentPrice - p.entryPrice;
  return p.direction === "long" ? delta * p.size : -delta * p.size;
}

export function realizedPnl(trades: Trade[]): number {
  let pnl = 0;
  const lots: { size: number; price: number }[] = [];
  const ordered = [...trades].sort((a, b) => a.time.localeCompare(b.time));
  for (const t of ordered) {
    if (t.side === "buy") {
      lots.push({ size: t.size, price: t.price });
      pnl -= t.fee;
    } else {
      let remaining = t.size;
      while (remaining > 1e-12 && lots.length) {
        const lot = lots[0]!;
        const take = Math.min(lot.size, remaining);
        pnl += (t.price - lot.price) * take - t.fee * (take / t.size);
        lot.size -= take;
        remaining -= take;
        if (lot.size <= 1e-12) lots.shift();
      }
    }
  }
  return pnl;
}

export function equity(bankroll: Bankroll, positions: Position[]): number {
  const u = positions.reduce((s, p) => s + unrealizedPnl(p), 0);
  return bankroll.cash + bankroll.margin + u - bankroll.reserved;
}

export function maxDrawdown(equitySeries: number[]): number {
  let peak = equitySeries[0] ?? 0;
  let maxDd = 0;
  for (const x of equitySeries) {
    peak = Math.max(peak, x);
    if (peak > 0) maxDd = Math.max(maxDd, (peak - x) / peak);
  }
  return maxDd;
}

export function exposureByInstrument(positions: Position[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of positions) {
    out[p.instrumentId] = (out[p.instrumentId] ?? 0) + Math.abs(p.size * p.currentPrice);
  }
  return out;
}

/** Kelly fraction for buying a contract at implied price. Capped — never a size order. */
export function kellyFraction(
  modelP: number,
  implied: number,
  cap: number
): { raw: number; capped: number } {
  if (!(implied > 0 && implied < 1) || !(modelP >= 0 && modelP <= 1)) {
    return { raw: 0, capped: 0 };
  }
  const b = (1 - implied) / implied;
  const raw = (modelP * (b + 1) - 1) / b;
  const capped = Math.max(0, Math.min(cap, raw));
  return { raw, capped };
}

export function classifyEdge(absEdge: number): EdgeClass {
  if (absEdge >= 0.12) return "large";
  if (absEdge >= 0.05) return "medium";
  return "small";
}

export function classifyConfidence(score: number): Confidence {
  if (score >= 0.66) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function volatilityScore(prices: number[]): number {
  if (prices.length < 2) return 0;
  const rets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1]!;
    const b = prices[i]!;
    if (a > 0) rets.push((b - a) / a);
  }
  if (!rets.length) return 0;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const varc = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length;
  return Math.min(1, Math.sqrt(varc) * 8);
}

export function horizonRiskMultiplier(h: Horizon): number {
  if (h === "5m") return 1.25;
  if (h === "72h") return 0.85;
  return 1;
}

export function decide(input: {
  edgeScore: number;
  riskScore: number;
  confidence: Confidence;
  whaleFlag: boolean;
  mispricingFlag: boolean;
  noNewRisk: boolean;
}): DecisionType {
  if (input.noNewRisk) return input.edgeScore < -0.04 ? "exit" : "avoid";
  if (input.confidence === "low") return "wait";
  if (input.edgeScore <= -0.05) return "avoid";
  if (input.edgeScore < 0.03) return "wait";
  if (input.riskScore >= 0.75) return "trim";
  // confidence "low" already returned "wait" above, so it cannot reach here.
  if (input.mispricingFlag && input.edgeScore >= 0.05) {
    return "enter";
  }
  if (input.whaleFlag && input.edgeScore < 0.08) return "wait";
  if (input.edgeScore >= 0.05 && input.riskScore < 0.65) return "enter";
  return "wait";
}

export function decisionToProposalAction(
  d: DecisionType
): "enter_small" | "wait" | "avoid" | "exit_partial" | "trim" {
  if (d === "enter") return "enter_small";
  if (d === "exit") return "exit_partial";
  if (d === "trim") return "trim";
  if (d === "avoid") return "avoid";
  return "wait";
}

/** Brier score for a binary outcome. ALPHA measurement — not a live proof by itself. */
export function brierScore(p: number, outcome: 0 | 1): number {
  const x = Math.min(1, Math.max(0, Number(p)));
  const y = outcome === 1 ? 1 : 0;
  return (x - y) * (x - y);
}

export function meanBrier(rows: Array<{ modelProbability: number; outcome: 0 | 1 }>): number | null {
  if (!rows.length) return null;
  return rows.reduce((s, r) => s + brierScore(r.modelProbability, r.outcome), 0) / rows.length;
}

export function reliabilityBins(
  rows: Array<{ modelProbability: number; outcome: 0 | 1 }>,
  binCount = 5
): Array<{ bin: number; lo: number; hi: number; n: number; meanP: number; meanY: number }> {
  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: i,
    lo: i / binCount,
    hi: (i + 1) / binCount,
    n: 0,
    sumP: 0,
    sumY: 0,
  }));
  for (const r of rows) {
    const p = Math.min(0.999, Math.max(0, r.modelProbability));
    const i = Math.min(binCount - 1, Math.floor(p * binCount));
    bins[i]!.n += 1;
    bins[i]!.sumP += p;
    bins[i]!.sumY += r.outcome;
  }
  return bins.map((b) => ({
    bin: b.bin,
    lo: b.lo,
    hi: b.hi,
    n: b.n,
    meanP: b.n ? b.sumP / b.n : 0,
    meanY: b.n ? b.sumY / b.n : 0,
  }));
}

/** Hypothetical contract PnL if human had entered YES at implied. Never an order. */
export function hypotheticalContractPnl(size: number, implied: number, outcome: 0 | 1): number {
  if (!(size > 0) || !(implied > 0 && implied < 1)) return 0;
  return size * (outcome - implied);
}

export const SIM_CALIBRATION_MIN_N = 8;

export function simulatedCalibrationStatus(n: number): "ADEQUATE_ALPHA" | "INSUFFICIENT_N" {
  return n >= SIM_CALIBRATION_MIN_N ? "ADEQUATE_ALPHA" : "INSUFFICIENT_N";
}
