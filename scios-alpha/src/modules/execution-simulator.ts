import { PredictionEngine } from "./prediction-engine";
import { RiskEngine } from "./risk-engine";

interface ScenarioConfig {
  name: string;
  horizonMinutes: number;
  initialCapital: number;
  riskLimit: number;
}

export class ExecutionSimulator {
  constructor(
    private pe: PredictionEngine,
    private re: RiskEngine
  ) {}

  async init() {
    console.log("[ExecutionSimulator] init – paper trading loop (ALPHA)");
  }

  async runScenario(cfg: ScenarioConfig) {
    console.log(`[ExecutionSimulator] scenario ${cfg.name} start`);
    let capital = cfg.initialCapital;

    for (let t = 0; t < cfg.horizonMinutes; t += 5) {
      const pred = await this.pe.predict();
      const risk = this.re.assess(pred, capital);

      if (!risk.allowed) {
        console.log(
          `[t=${t}] ABSTAIN – ${risk.reason}, VaR=${risk.varEstimate.toFixed(2)}`
        );
        continue;
      }

      const positionSize = capital * cfg.riskLimit;
      const pnl = positionSize * pred.expectedReturn;
      capital += pnl;

      console.log(
        `[t=${t}] TRADE: ret=${(pred.expectedReturn * 100).toFixed(2)}% ` +
          `pnl=${pnl.toFixed(2)} capital=${capital.toFixed(2)}`
      );
    }

    console.log(
      `[ExecutionSimulator] scenario ${cfg.name} end – final capital=${capital.toFixed(2)}`
    );
  }

  async runContinuous() {
    let capital = 100000;
    setInterval(async () => {
      const pred = await this.pe.predict();
      const risk = this.re.assess(pred, capital);

      if (!risk.allowed) {
        console.log(`[LIVE] ABSTAIN – ${risk.reason}`);
        return;
      }

      const positionSize = capital * 0.02;
      const pnl = positionSize * pred.expectedReturn;
      capital += pnl;

      console.log(
        `[LIVE] ret=${(pred.expectedReturn * 100).toFixed(2)}% ` +
          `pnl=${pnl.toFixed(2)} capital=${capital.toFixed(2)}`
      );
    }, 5000);
  }
}
