import { Prediction } from "./prediction-engine";

export interface RiskAssessment {
  allowed: boolean;
  varEstimate: number;
  reason?: string;
}

export class RiskEngine {
  async init() {
    console.log("[RiskEngine] init – simple VaR gate (ALPHA)");
  }

  assess(pred: Prediction, capital: number): RiskAssessment {
    const varEstimate = Math.abs(pred.expectedReturn) * capital;
    const limit = capital * 0.05;

    if (varEstimate > limit) {
      return { allowed: false, varEstimate, reason: "VaR limit exceeded" };
    }
    return { allowed: true, varEstimate };
  }
}
