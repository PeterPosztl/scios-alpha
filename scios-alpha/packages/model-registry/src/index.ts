import type { ModelMeta } from "@scios/data-fabric";

export const NON_PRODUCTION_MATURITY = "NON-PRODUCTION" as const;

export const BASELINE_NON_PRODUCTION_MODELS: ModelMeta[] = [
  {
    modelId: "baseline-logistic",
    version: "1.0.0",
    type: "ml",
    inputFeatures: ["momentum", "volatility", "liquidity"],
    outputType: "distribution",
  },
];

export class InMemoryModelRegistry {
  private models = new Map<string, ModelMeta>();

  register(meta: ModelMeta): void {
    this.models.set(meta.modelId, meta);
  }

  get(modelId: string): ModelMeta | undefined {
    return this.models.get(modelId);
  }

  list(): ModelMeta[] {
    return Array.from(this.models.values());
  }
}

export const modelRegistry = new InMemoryModelRegistry();

export function seedNonProductionModels(
  registry: InMemoryModelRegistry = modelRegistry
): ModelMeta[] {
  for (const meta of BASELINE_NON_PRODUCTION_MODELS) {
    if (!registry.get(meta.modelId)) registry.register(meta);
  }
  return registry.list();
}

export function modelHonesty(modelId: string) {
  return {
    modelId,
    maturityLabel: NON_PRODUCTION_MATURITY,
    scienceStatus: "FOUNDATION",
    validationStatus: "UNVALIDATED",
    productionEligible: false,
  };
}

seedNonProductionModels(modelRegistry);
