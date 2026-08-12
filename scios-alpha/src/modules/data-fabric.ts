export class DataFabric {
  async init() {
    console.log("[DataFabric] init – mock in-memory fabric (ALPHA)");
  }

  async getMarketSnapshot() {
    return {
      timestamp: new Date(),
      price: 100 + Math.random() * 10,
      volatility: 0.2 + Math.random() * 0.05,
    };
  }
}
