import { FeatureStore } from "./feature-store";

export interface Prediction {
  ts: Date;
  expectedReturn: number;
  uncertainty: number;
}

export class PredictionEngine {
  constructor(private fs: FeatureStore) {}

  async init() {
    console.log("[PredictionEngine] init – baseline linear model (ALPHA)");
  }

  async predict(): Promise<Prediction> {
    const f = await this.fs.getFeatures();
    const expectedReturn = (f.priceNorm - 1) * 0.5 - f.vol * 0.1;
    const uncertainty = 0.02 + f.vol * 0.05;

    return { ts: f.ts, expectedReturn, uncertainty };
  }
}
