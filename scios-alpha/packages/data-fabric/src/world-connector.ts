/**
 * World Connector + profession serving contracts — additive Zod.
 * PCT Prediction/Risk envelopes stay intact; sourceTickIds is optional.
 * ALPHA_NON_PRODUCTION. Live ticks never certified. durable=false here.
 */
import { createHash } from "crypto";
import { z } from "zod";

export const WorldFeedModeSchema = z.enum(["simulated_alpha", "live_unverified"]);

export const MarketRefSchema = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
});
export type MarketRef = z.infer<typeof MarketRefSchema>;

export const ContractRefSchema = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
  outcomeId: z.string().min(1),
});
export type ContractRef = z.infer<typeof ContractRefSchema>;

export const WorldTickSchema = z.object({
  id: z.string(),
  source: z.string(),
  eventTime: z.string(),
  ingestionTime: z.string(),
  validFrom: z.string(),
  validTo: z.string().optional(),
  revisionId: z.string(),
  feed: WorldFeedModeSchema,
  certified: z.literal(false),
  payload: z.record(z.unknown()).default({}),
});
export type WorldTick = z.infer<typeof WorldTickSchema>;

export const OhlcBarSchema = z.object({
  instrumentId: z.string().min(1),
  interval: z.enum(["1h", "1d"]),
  t: z.string(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
  source: z.string().min(1),
  feed: WorldFeedModeSchema,
});
export type OhlcBar = z.infer<typeof OhlcBarSchema>;

export const NewsEventSchema = z.object({
  eventId: z.string().min(1),
  source: z.string().min(1),
  guid: z.string().min(1),
  title: z.string(),
  url: z.string().optional(),
  publishedAt: z.string(),
  mappedInstrumentId: z.string().nullable(),
  orphan: z.boolean(),
});
export type NewsEvent = z.infer<typeof NewsEventSchema>;

export const OHLC_FAMILY_IDS = ["market_portfolio_risk", "market_intelligence"] as const;

export function ohlcAllowedForFamily(familyId: string): boolean {
  return (OHLC_FAMILY_IDS as readonly string[]).includes(familyId);
}

/** Empty or missing hashes → UNKNOWN. Mismatch → false. All prevHash links match → true. */
export function verifyLineageChain(
  nodes: Array<{ hash: string; prevHash: string | null }> | undefined
): true | false | "UNKNOWN" {
  if (!nodes || nodes.length === 0) return "UNKNOWN";
  if (nodes.some((n) => !n.hash)) return "UNKNOWN";
  let prev: string | null = null;
  for (const node of nodes) {
    if (node.prevHash !== prev) return false;
    prev = node.hash;
  }
  return true;
}

export const LINEAGE_VERIFIED_DEFAULT = "UNKNOWN" as const;

/** eventId = sha256(source+guid). Deterministic; never Math.random. */
export function hashNormalizedEventId(source: string, guid: string): string {
  return createHash("sha256").update(String(source) + String(guid), "utf8").digest("hex");
}

export function resolveInstrumentAlias(input: {
  id?: string;
  ticker?: string;
  symbol?: string;
  primaryObject?: string;
  metadata?: { primaryObject?: unknown };
} | null | undefined): string | "UNKNOWN" {
  if (!input) return "UNKNOWN";
  const meta =
    input.metadata && typeof input.metadata.primaryObject === "string"
      ? input.metadata.primaryObject
      : undefined;
  const hit = input.ticker || input.symbol || input.id || input.primaryObject || meta;
  return hit && String(hit).trim() ? String(hit).trim() : "UNKNOWN";
}

export const ONTOLOGY_RELATION_SPINE = [
  "PRODUCES",
  "SUPPORTS",
  "TRAINS",
  "PRODUCES",
  "REQUIRES",
  "PROVES",
] as const;

export const ONTOLOGY_SPINE_LABEL = "PRODUCES→SUPPORTS→TRAINS→PRODUCES→REQUIRES→PROVES";
export const ROLE_EVALUATES_DECISION = "EVALUATES" as const;
export const ONTOLOGY_NATIONAL_GRAPH = false as const;
export const ONTOLOGY_CAUSAL_QUERY_ENGINE = "ABSENT" as const;

export const FabricSnapshotKindSchema = z.enum(["feature", "prediction", "risk", "governance"]);
export type FabricSnapshotKind = z.infer<typeof FabricSnapshotKindSchema>;

export const FabricSnapshotSchema = z.object({
  kind: FabricSnapshotKindSchema,
  status: z.enum(["PRESENT", "UNKNOWN"]),
  refId: z.string().nullable(),
  payload: z.record(z.unknown()).nullable(),
});
export type FabricSnapshot = z.infer<typeof FabricSnapshotSchema>;

export function fabricSnapshot(
  kind: FabricSnapshotKind,
  payload: Record<string, unknown> | null | undefined
): FabricSnapshot {
  if (payload == null) {
    return { kind, status: "UNKNOWN", refId: null, payload: null };
  }
  const ref = payload.refId ?? payload.id ?? payload.snapshotId;
  return {
    kind,
    status: "PRESENT",
    refId: typeof ref === "string" && ref ? ref : null,
    payload,
  };
}

export const ProofArtifactVerdictSchema = z.enum(["PASS", "FAIL", "UNKNOWN", "DEGRADED"]);

export function fabricLedgerActor(roleId: string): string {
  return "human:" + roleId;
}

export const FABRIC_LEDGER_HONESTY = {
  persisted: false as const,
  durable: false as const,
};

export const FabricLedgerEntrySchema = z.object({
  actor: z.string().regex(/^human:/),
  persisted: z.literal(false),
  durable: z.literal(false),
  roleId: z.string().min(1),
});

export function makeNewsEvent(input: {
  source: string;
  guid: string;
  title: string;
  publishedAt: string;
  url?: string;
  mappedInstrumentId?: string | null;
}): z.infer<typeof NewsEventSchema> {
  const mapped = input.mappedInstrumentId ?? null;
  return NewsEventSchema.parse({
    eventId: hashNormalizedEventId(input.source, input.guid),
    source: input.source,
    guid: input.guid,
    title: input.title,
    url: input.url,
    publishedAt: input.publishedAt,
    mappedInstrumentId: mapped,
    orphan: mapped == null,
  });
}
