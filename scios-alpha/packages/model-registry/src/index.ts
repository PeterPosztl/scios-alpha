import type { ModelMeta } from "@scios/data-fabric";
import {
  getModelValidation,
  uiValidationTruth,
  VALIDATION_SCHEMA_VERSION,
  VALIDATION_STATES,
  normalizeValidationState,
  isValidValidationState,
  assertValidationTruth,
  listValidationRecords,
  createValidationEvidence,
  applyValidationEvidence,
  checkValidationStale,
  defaultValidationRecord,
  resetValidationCacheForTests,
  type ValidationState,
  type ValidationEvidence,
  type ModelValidationRecord,
} from "./validation.js";

export const NON_PRODUCTION_MATURITY = "NON-PRODUCTION" as const;

export const BASELINE_NON_PRODUCTION_MODELS: ModelMeta[] = [
  {
    modelId: "baseline-logistic",
    version: "1.0.0",
    type: "ml",
    inputFeatures: ["momentum", "volatility", "liquidity"],
    outputType: "distribution",
  },
  {
    modelId: "dil-probability-alpha",
    version: "0.1.0",
    type: "ml",
    inputFeatures: ["implied_price", "volume", "liquidity", "whale_prints"],
    outputType: "distribution",
  },
  {
    modelId: "dil-edge-alpha",
    version: "0.1.0",
    type: "ml",
    inputFeatures: ["model_probability", "implied_probability"],
    outputType: "point",
  },
  {
    modelId: "dil-risk-kelly-alpha",
    version: "0.1.0",
    type: "ml",
    inputFeatures: ["edge", "bankroll", "drawdown", "horizon"],
    outputType: "point",
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

export {
  VALIDATION_SCHEMA_VERSION,
  VALIDATION_STATES,
  normalizeValidationState,
  isValidValidationState,
  assertValidationTruth,
  uiValidationTruth,
  getModelValidation,
  listValidationRecords,
  createValidationEvidence,
  applyValidationEvidence,
  checkValidationStale,
  defaultValidationRecord,
  resetValidationCacheForTests,
  type ValidationState,
  type ValidationEvidence,
  type ModelValidationRecord,
};

export function modelHonesty(modelId: string) {
  const v = getModelValidation(modelId);
  const ui = uiValidationTruth(v);
  return {
    modelId,
    maturityLabel: NON_PRODUCTION_MATURITY,
    scienceStatus: "FOUNDATION",
    validationStatus: ui.displayState,
    validationLabel: ui.displayLabel,
    productionEligible: ui.mayClaimProduction,
    validationHonest: ui.honest,
  };
}

seedNonProductionModels(modelRegistry);
