import { DataFabric } from "./modules/data-fabric";
import { FeatureStore } from "./modules/feature-store";
import { PredictionEngine } from "./modules/prediction-engine";
import { RiskEngine } from "./modules/risk-engine";
import { ExecutionSimulator } from "./modules/execution-simulator";

export interface MasterContext {
  dataFabric: DataFabric;
  featureStore: FeatureStore;
  predictionEngine: PredictionEngine;
  riskEngine: RiskEngine;
  executionSimulator: ExecutionSimulator;
}

async function bootstrap(): Promise<MasterContext> {
  const dataFabric = new DataFabric();
  const featureStore = new FeatureStore(dataFabric);
  const predictionEngine = new PredictionEngine(featureStore);
  const riskEngine = new RiskEngine();
  const executionSimulator = new ExecutionSimulator(
    predictionEngine,
    riskEngine
  );

  await dataFabric.init();
  await featureStore.init();
  await predictionEngine.init();
  await riskEngine.init();
  await executionSimulator.init();

  return {
    dataFabric,
    featureStore,
    predictionEngine,
    riskEngine,
    executionSimulator,
  };
}

async function main() {
  const mode = process.argv[2] || "dev";
  const ctx = await bootstrap();

  switch (mode) {
    case "simulate":
      await ctx.executionSimulator.runScenario({
        name: "alpha-default",
        horizonMinutes: 60,
        initialCapital: 100000,
        riskLimit: 0.05,
      });
      break;
    case "health":
      console.log("SCI OS ×10 ALPHA – health OK (modules wired)");
      break;
    default:
      console.log("SCI OS ×10 ALPHA – dev loop running…");
      await ctx.executionSimulator.runContinuous();
  }
}

main().catch((err) => {
  console.error("MASTER FATAL:", err);
  process.exit(1);
});
