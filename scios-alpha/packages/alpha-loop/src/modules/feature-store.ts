import { DataFabric } from "./data-fabric";

export class FeatureStore {
  constructor(private fabric: DataFabric) {}

  async init() {
    console.log("[FeatureStore] init – point-in-time mock (ALPHA)");
  }

  async getFeatures() {
    const snap = await this.fabric.getMarketSnapshot();
    return {
      ts: snap.timestamp,
      price: snap.price,
      vol: snap.volatility,
      priceNorm: snap.price / 100,
      riskScore: snap.volatility * 10,
    };
  }
}
