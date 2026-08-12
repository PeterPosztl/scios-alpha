import { SeededRng } from "./seeded-rng";

/**
 * ALPHA DataFabric — in-memory mock.
 * NON-PRODUCTION. Deterministic when SCIOS_SEED is set.
 */
export class DataFabric {
  private readonly rng: SeededRng;

  constructor(seed = Number(process.env.SCIOS_SEED ?? 42)) {
    this.rng = new SeededRng(seed);
  }

  async init() {
    console.log(
      "[DataFabric] init – mock in-memory fabric (ALPHA, NON-PRODUCTION)"
    );
  }

  async getMarketSnapshot() {
    return {
      timestamp: new Date(),
      price: 100 + this.rng.range(0, 10),
      volatility: 0.2 + this.rng.range(0, 0.05),
    };
  }
}
