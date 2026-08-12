/**
 * Enterprise Ontology — Wave 1 typed contracts (Zod).
 * Full graph engine / migrations: ABSENT (see MASTER_CONTRACT.md).
 */
import { z } from "zod";

export const EntityBaseSchema = z.object({
  id: z.string(),
  version: z.string(),
  owner: z.string(),
  tenantId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lineage: z.array(z.string()).default([]),
  schemaId: z.string().default("ontology/v1"),
});

export const OntologyRelationType = z.enum([
  "PRODUCES",
  "TRAINS",
  "SUPPORTS",
  "REQUIRES",
  "MAY_REQUIRE",
  "CHANGES",
  "EVALUATES",
  "AFFECTS",
  "MODIFIES",
  "VALIDATES",
  "PROVES",
]);

export const OntologyRelationSchema = z.object({
  id: z.string(),
  type: OntologyRelationType,
  fromId: z.string(),
  fromKind: z.string(),
  toId: z.string(),
  toKind: z.string(),
  validFrom: z.string(),
  validTo: z.string().optional(),
  tenantId: z.string(),
});

export type OntologyRelation = z.infer<typeof OntologyRelationSchema>;

export const TenantSchema = EntityBaseSchema.extend({
  kind: z.literal("Tenant"),
  name: z.string(),
});

export const UserSchema = EntityBaseSchema.extend({
  kind: z.literal("User"),
  email: z.string().email().or(z.string()),
  roleIds: z.array(z.string()),
});

export const RoleSchema = EntityBaseSchema.extend({
  kind: z.literal("Role"),
  name: z.enum([
    "researcher",
    "operator",
    "risk_officer",
    "admin",
    "auditor",
  ]),
});

export const PolicySchema = EntityBaseSchema.extend({
  kind: z.literal("Policy"),
  name: z.string(),
  expression: z.string(),
});

export const DatasetSchema = EntityBaseSchema.extend({
  kind: z.literal("Dataset"),
  name: z.string(),
  uri: z.string(),
});

export const DataSourceSchema = EntityBaseSchema.extend({
  kind: z.literal("DataSource"),
  name: z.string(),
  connector: z.string(),
});

export const DataContractSchema = EntityBaseSchema.extend({
  kind: z.literal("DataContract"),
  datasetId: z.string(),
  schemaRef: z.string(),
});

export const FeatureSchema = EntityBaseSchema.extend({
  kind: z.literal("Feature"),
  name: z.string(),
  dataType: z.enum(["number", "string", "bool", "embedding"]),
});

export const ExperimentSchema = EntityBaseSchema.extend({
  kind: z.literal("Experiment"),
  hypothesisId: z.string(),
  status: z.enum(["running", "success", "failed", "invalid"]),
});

export const HypothesisSchema = EntityBaseSchema.extend({
  kind: z.literal("Hypothesis"),
  statement: z.string(),
});

export const ModelSchema = EntityBaseSchema.extend({
  kind: z.literal("Model"),
  name: z.string(),
  family: z.enum([
    "baseline",
    "statistical",
    "ml",
    "dl",
    "bayesian",
    "timeseries",
    "graph",
    "ensemble",
  ]),
});

export const ModelVersionSchema = EntityBaseSchema.extend({
  kind: z.literal("ModelVersion"),
  modelId: z.string(),
  artifactUri: z.string(),
  nonProduction: z.boolean().default(true),
});

export const PredictionSchema = EntityBaseSchema.extend({
  kind: z.literal("Prediction"),
  modelVersionId: z.string(),
  mean: z.number(),
  variance: z.number(),
  calibrated: z.boolean(),
  oodScore: z.number().optional(),
  abstain: z.boolean().default(false),
});

export const DecisionSchema = EntityBaseSchema.extend({
  kind: z.literal("Decision"),
  predictionId: z.string(),
  action: z.enum([
    "BUY",
    "SELL",
    "BACK",
    "LAY",
    "NO_ACTION",
    "HUMAN_REVIEW",
  ]),
  expectedUtility: z.number(),
});

export const RiskDecisionSchema = EntityBaseSchema.extend({
  kind: z.literal("RiskDecision"),
  decisionId: z.string(),
  allowed: z.boolean(),
  reasons: z.array(z.string()),
});

export const ApprovalSchema = EntityBaseSchema.extend({
  kind: z.literal("Approval"),
  targetId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export const OrderSchema = EntityBaseSchema.extend({
  kind: z.literal("Order"),
  side: z.enum(["buy", "sell"]),
  size: z.number(),
  status: z.string(),
});

export const ExecutionSchema = EntityBaseSchema.extend({
  kind: z.literal("Execution"),
  orderId: z.string(),
  fillPrice: z.number(),
  fillSize: z.number(),
});

export const PositionSchema = EntityBaseSchema.extend({
  kind: z.literal("Position"),
  instrumentId: z.string(),
  quantity: z.number(),
  notional: z.number(),
});

export const ExposureSchema = EntityBaseSchema.extend({
  kind: z.literal("Exposure"),
  portfolioId: z.string(),
  gross: z.number(),
  net: z.number(),
});

export const SettlementSchema = EntityBaseSchema.extend({
  kind: z.literal("Settlement"),
  executionId: z.string(),
  amount: z.number(),
});

export const OutcomeSchema = EntityBaseSchema.extend({
  kind: z.literal("Outcome"),
  predictionId: z.string(),
  realized: z.number(),
});

export const IncidentSchema = EntityBaseSchema.extend({
  kind: z.literal("Incident"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string(),
});

export const ServiceSchema = EntityBaseSchema.extend({
  kind: z.literal("Service"),
  name: z.string(),
  healthEndpoint: z.string(),
});

export const ProofArtifactSchema = EntityBaseSchema.extend({
  kind: z.literal("ProofArtifact"),
  claimId: z.string(),
  uri: z.string(),
  verdict: z.enum(["PASS", "FAIL", "UNKNOWN", "DEGRADED"]),
});

export const OntologyEntitySchema = z.discriminatedUnion("kind", [
  TenantSchema,
  UserSchema,
  RoleSchema,
  PolicySchema,
  DatasetSchema,
  DataSourceSchema,
  DataContractSchema,
  FeatureSchema,
  ExperimentSchema,
  HypothesisSchema,
  ModelSchema,
  ModelVersionSchema,
  PredictionSchema,
  DecisionSchema,
  RiskDecisionSchema,
  ApprovalSchema,
  OrderSchema,
  ExecutionSchema,
  PositionSchema,
  ExposureSchema,
  SettlementSchema,
  OutcomeSchema,
  IncidentSchema,
  ServiceSchema,
  ProofArtifactSchema,
]);

export type OntologyEntity = z.infer<typeof OntologyEntitySchema>;

/** In-memory ontology store — Wave 1 ALPHA (not graph DB). */
export class InMemoryOntologyStore {
  private entities = new Map<string, OntologyEntity>();
  private relations: OntologyRelation[] = [];

  upsert(entity: OntologyEntity): void {
    const parsed = OntologyEntitySchema.parse(entity);
    this.entities.set(parsed.id, parsed);
  }

  get(id: string): OntologyEntity | undefined {
    return this.entities.get(id);
  }

  relate(rel: OntologyRelation): void {
    this.relations.push(OntologyRelationSchema.parse(rel));
  }

  neighbors(id: string, type?: z.infer<typeof OntologyRelationType>): OntologyRelation[] {
    return this.relations.filter(
      (r) =>
        (r.fromId === id || r.toId === id) &&
        (type ? r.type === type : true)
    );
  }

  health(): { ok: boolean; entities: number; relations: number } {
    return {
      ok: true,
      entities: this.entities.size,
      relations: this.relations.length,
    };
  }
}
