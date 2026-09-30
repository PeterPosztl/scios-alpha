/**
 * ProfessionBlueprint Zod — validates registry compose output.
 * Compose lives in @scios/professional-domain-registry (200 INST, not 200 apps).
 * ALPHA_NON_PRODUCTION
 */
import { z } from "zod";

export const ProfessionHonestySchema = z.object({
  autoTrade: z.literal(false),
  ready: z.literal(false),
  durable: z.literal(false),
  execution: z.literal(false),
  pgDriver: z.literal("ABSENT"),
  calibratedLive: z.literal(false),
  inventedSops: z.literal(false),
  liveDomainData: z.literal(false),
  secondShell: z.literal(false),
  roles200Validated: z.literal(false),
});

export const ProfessionBlueprintSchema = z.object({
  schema: z.literal("sci-os-profession-blueprint/v1"),
  label: z.literal("ALPHA_NON_PRODUCTION"),
  roleId: z.string().min(1),
  name: z.string(),
  domainFamily: z.string(),
  inherit: z.string(),
  archetypeId: z.string(),
  status: z.literal("SEED_RESEARCH_REQUIRED"),
  specialist: z.boolean(),
  deltas: z.object({}).strict(),
  inventedSops: z.literal(false),
  honesty: ProfessionHonestySchema,
  domain: z.object({
    primaryObject: z.string(),
    inputAdapters: z.array(z.string()),
    eventTypes: z.array(z.string()),
  }),
  family: z.object({
    famId: z.string(),
    id: z.string(),
    primaryObject: z.string(),
    queue: z.string(),
    ohlc: z.boolean(),
    marketRef: z.boolean(),
    newsEvent: z.boolean(),
    predictionMeaning: z.string(),
    decisionSet: z.array(z.string()),
    charts: z.array(z.string()),
    evidenceRules: z.string(),
    ribbonEmphasis: z.string(),
    skip: z.boolean(),
  }),
  ontology: z.object({
    chain: z.string(),
    relationSpine: z.literal("PRODUCES→SUPPORTS→TRAINS→PRODUCES→REQUIRES→PROVES"),
    roleEvaluates: z.literal("EVALUATES"),
    nationalGraph: z.literal(false),
    causalQueryEngine: z.literal("ABSENT"),
  }),
  lineage: z.object({
    path: z.string(),
    verified: z.literal("UNKNOWN"),
  }),
  evidence: z.object({
    verdictDefault: z.literal("UNKNOWN"),
    verdictsAllowed: z.array(z.enum(["PASS", "FAIL", "UNKNOWN", "DEGRADED"])),
    rules: z.string(),
  }),
  engine: z.object({
    prediction: z.string(),
    risk: z.string(),
    decision: z.string(),
    sim: z.string(),
    lineage: z.string(),
    evidence: z.string(),
    compute: z.string(),
  }),
  reporting: z.object({ empty: z.literal("UNKNOWN") }),
  governance: z.object({ autoExecute: z.literal(false), requiresHuman: z.literal(true) }),
  gw: z.object({ GW1: z.literal("ANALOG"), GW2_GW7: z.literal("PREPARED_DISABLED") }),
  ledger: z.object({
    actor: z.string(),
    persisted: z.literal(false),
    durable: z.literal(false),
  }),
  ribbon: z.object({
    stages: z.array(z.string()).length(11),
    emphasis: z.string(),
  }),
});

export type ProfessionBlueprint = z.infer<typeof ProfessionBlueprintSchema>;

export const FamilyUxV3Schema = z.object({
  schema: z.literal("sci-os-family-ux-v3/v1"),
  label: z.literal("ALPHA_NON_PRODUCTION"),
  id: z.string(),
  famId: z.string().nullable(),
  status: z.enum(["SEED_RESEARCH_REQUIRED", "SKIPPED_RESEARCH_REQUIRED"]),
  skip: z.boolean(),
  ohlc: z.boolean(),
  marketRef: z.boolean().optional(),
  newsEvent: z.boolean().optional(),
  charts: z.array(z.string()),
  ribbonEmphasis: z.string(),
  evidenceRules: z.string(),
  decisionSet: z.array(z.string()),
  stub: z.boolean(),
  predictionMeaning: z.string().optional(),
  queue: z.string().optional(),
  honesty: ProfessionHonestySchema,
});

export const HeroV3Schema = z.object({
  schema: z.literal("sci-os-hero-v3/v1"),
  label: z.literal("ALPHA_NON_PRODUCTION"),
  roleId: z.string().min(1),
  requestedRoleId: z.string(),
  name: z.string(),
  familyOverline: z.string(),
  queue: z.string(),
  family: FamilyUxV3Schema,
  layout: z.object({
    page: z.object({ bg: z.string(), padPx: z.literal(48) }),
    section: z.object({ padPx: z.literal(24) }),
    card: z.object({
      surface: z.literal(true),
      fogBorder: z.literal(true),
      iceLeftPx: z.literal(2),
      padPx: z.literal(12),
    }),
    grid: z.object({ columns: z.literal(12), gutterPx: z.literal(12), maxPx: z.literal(1180) }),
    density: z.array(z.string()),
    motion: z.object({
      microMs: z.literal(150),
      sciMs: z.literal(180),
      macroMs: z.literal(300),
      criticalMs: z.literal(0),
    }),
  }),
  ribbon: z.object({
    stages: z.array(z.string()).length(11),
    emphasis: z.string(),
  }),
  missionPanels: z.array(z.object({ id: z.string(), span: z.string(), module: z.string() })).length(8),
  missionCopy: z.record(z.string()),
  charts: z.array(z.string()),
  decisionGate: z.object({
    decisionSet: z.array(z.string()),
    approveDisabledIfReject: z.literal(true),
    autoExecute: z.literal(false),
    tone: z.literal("proposal"),
  }),
  simulation: z.object({ simulated: z.literal(true), executed: z.literal(false) }),
  lineage: z.object({ verified: z.literal("UNKNOWN") }),
  evidence: z.object({ verdictDefault: z.literal("UNKNOWN"), emptyMeans: z.literal("UNKNOWN") }),
  reporting: z.object({ empty: z.literal("UNKNOWN") }),
  honesty: ProfessionHonestySchema,
  inventedSops: z.literal(false),
  specialist: z.boolean(),
  status: z.literal("SEED_RESEARCH_REQUIRED"),
  roles200Validated: z.literal(false),
  roleSwitchMotionMs: z.literal(300),
  ohlc: z.boolean(),
  skip: z.boolean(),
  stub: z.boolean(),
  overlayOnly: z.boolean(),
  ledger: z.object({
    actor: z.string(),
    persisted: z.literal(false),
    durable: z.literal(false),
  }),
  engine: z.object({
    prediction: z.string(),
    risk: z.string(),
    decision: z.string(),
    sim: z.string(),
    lineage: z.string(),
    evidence: z.string(),
    compute: z.string(),
  }),
});

export type HeroV3 = z.infer<typeof HeroV3Schema>;
export type FamilyUxV3 = z.infer<typeof FamilyUxV3Schema>;
