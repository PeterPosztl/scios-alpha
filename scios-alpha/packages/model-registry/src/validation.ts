/**
 * CF28 — canonical model validation state (ALPHA_NON_PRODUCTION).
 * UNVALIDATED ≠ VALIDATED — evidence required for VALIDATED.
 */
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export const VALIDATION_SCHEMA_VERSION = "sci-os-model-validation/v1";

/** Canonical CF28 validation states */
export const VALIDATION_STATES = [
  "NOT_VALIDATED",
  "VALIDATED",
  "FAILED",
  "UNKNOWN",
] as const;

export type ValidationState = (typeof VALIDATION_STATES)[number];

export type ValidationEvidenceKind =
  | "validation_pass"
  | "validation_fail"
  | "validation_stale"
  | "validation_unknown";

export interface ValidationEvidence {
  evidenceId: string;
  kind: ValidationEvidenceKind;
  modelId: string;
  outcome: ValidationState;
  summary: string;
  at: string;
  actorId?: string | null;
  runId?: string | null;
  buildId?: string | null;
  staleAfterMs?: number | null;
}

export interface ModelValidationRecord {
  schema: typeof VALIDATION_SCHEMA_VERSION;
  modelId: string;
  state: ValidationState;
  evidence: ValidationEvidence[];
  productionEligible: boolean;
  uiDisplayLabel: string;
  lastValidatedAt: string | null;
  updatedAt: string;
}

const LEGACY_ALIASES: Record<string, ValidationState> = {
  UNVALIDATED: "NOT_VALIDATED",
  NOT_VALIDATED: "NOT_VALIDATED",
  VALIDATED: "VALIDATED",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
};

const records = new Map<string, ModelValidationRecord>();
let hydrated = false;

function dataRoot() {
  const base = process.env.SCIOS_USER_DATA || process.env.LOCALAPPDATA || process.cwd();
  return join(base, "SCI OS X10", "data");
}

function validationDir() {
  const dir = join(dataRoot(), "validation");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function recordPath(modelId: string) {
  const safe = modelId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(validationDir(), `${safe}.json`);
}

function uiLabel(state: ValidationState): string {
  if (state === "NOT_VALIDATED") return "NOT VALIDATED";
  if (state === "VALIDATED") return "VALIDATED";
  if (state === "FAILED") return "VALIDATION FAILED";
  return "UNKNOWN";
}

export function normalizeValidationState(raw: unknown): ValidationState | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return LEGACY_ALIASES[key] ?? null;
}

export function isValidValidationState(state: unknown): state is ValidationState {
  return typeof state === "string" && VALIDATION_STATES.includes(state as ValidationState);
}

export interface ValidationTruthResult {
  ok: boolean;
  code?: string;
  detail?: string;
}

/** Backend truth invariants — never claim VALIDATED without pass evidence */
export function assertValidationTruth(record: ModelValidationRecord): ValidationTruthResult {
  if (!isValidValidationState(record.state)) {
    return { ok: false, code: "INVALID_VALIDATION_STATE", detail: String(record.state) };
  }
  const passEvidence = record.evidence.filter((e) => e.kind === "validation_pass");
  const failEvidence = record.evidence.filter((e) => e.kind === "validation_fail");

  if (record.state === "VALIDATED") {
    if (passEvidence.length === 0) {
      return { ok: false, code: "MISSING_EVIDENCE", detail: "VALIDATED requires validation_pass evidence" };
    }
    if (record.productionEligible !== false && record.productionEligible !== true) {
      return { ok: false, code: "PRODUCTION_FLAG_INVALID" };
    }
  }

  if (record.state === "FAILED" && failEvidence.length === 0) {
    return { ok: false, code: "MISSING_EVIDENCE", detail: "FAILED requires validation_fail evidence" };
  }

  if (record.state === "NOT_VALIDATED" && record.productionEligible === true) {
    return { ok: false, code: "TRUTH_VIOLATION", detail: "NOT_VALIDATED cannot be productionEligible" };
  }

  if (record.state === "UNKNOWN" && passEvidence.length > 0) {
    return { ok: false, code: "TRUTH_VIOLATION", detail: "UNKNOWN cannot coexist with pass evidence" };
  }

  return { ok: true };
}

/** UI truth invariant — never display VALIDATED unless backend state is VALIDATED with evidence */
export function uiValidationTruth(record: ModelValidationRecord) {
  const truth = assertValidationTruth(record);
  const displayState =
    truth.ok && record.state === "VALIDATED" && record.evidence.some((e) => e.kind === "validation_pass")
      ? "VALIDATED"
      : record.state === "FAILED"
        ? "FAILED"
        : record.state === "UNKNOWN"
          ? "UNKNOWN"
          : "NOT_VALIDATED";
  return {
    displayState,
    displayLabel: uiLabel(displayState as ValidationState),
    mayClaimProduction: displayState === "VALIDATED" && truth.ok,
    honest: truth.ok,
    code: truth.ok ? null : truth.code,
  };
}

function persistRecord(record: ModelValidationRecord) {
  const target = recordPath(record.modelId);
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(record, null, 2), "utf8");
  if (existsSync(target)) unlinkSync(target);
  renameSync(tmp, target);
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const dir = validationDir();
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".json")) continue;
    try {
      const raw = readFileSync(join(dir, ent.name), "utf8");
      const rec = JSON.parse(raw) as ModelValidationRecord;
      if (rec?.modelId && rec.schema === VALIDATION_SCHEMA_VERSION) {
        records.set(rec.modelId, rec);
      }
    } catch {
      /* skip corrupt */
    }
  }
}

export function defaultValidationRecord(modelId: string): ModelValidationRecord {
  const now = new Date().toISOString();
  return {
    schema: VALIDATION_SCHEMA_VERSION,
    modelId,
    state: "NOT_VALIDATED",
    evidence: [],
    productionEligible: false,
    uiDisplayLabel: uiLabel("NOT_VALIDATED"),
    lastValidatedAt: null,
    updatedAt: now,
  };
}

export function getModelValidation(modelId: string): ModelValidationRecord {
  hydrate();
  const existing = records.get(modelId);
  if (existing) return { ...existing };
  return defaultValidationRecord(modelId);
}

export function listValidationRecords(): ModelValidationRecord[] {
  hydrate();
  return [...records.values()].map((r) => ({ ...r }));
}

export function createValidationEvidence(
  modelId: string,
  kind: ValidationEvidenceKind,
  meta: {
    outcome: ValidationState;
    summary: string;
    actorId?: string;
    runId?: string;
    staleAfterMs?: number;
  }
): ValidationEvidence {
  return {
    evidenceId: `vev_${randomUUID()}`,
    kind,
    modelId,
    outcome: meta.outcome,
    summary: meta.summary,
    at: new Date().toISOString(),
    actorId: meta.actorId ?? null,
    runId: meta.runId ?? process.env.SCIOS_RUN_ID ?? null,
    buildId: process.env.SCIOS_BUILD_ID ?? null,
    staleAfterMs: meta.staleAfterMs ?? null,
  };
}

export function applyValidationEvidence(
  modelId: string,
  evidence: ValidationEvidence
): { record: ModelValidationRecord; error: string | null } {
  hydrate();
  const rec = records.get(modelId) ?? defaultValidationRecord(modelId);
  rec.evidence = [...rec.evidence, evidence].slice(-20);
  rec.state = evidence.outcome;
  rec.uiDisplayLabel = uiLabel(evidence.outcome);
  rec.productionEligible = evidence.outcome === "VALIDATED";
  rec.lastValidatedAt = evidence.outcome === "VALIDATED" ? evidence.at : rec.lastValidatedAt;
  rec.updatedAt = new Date().toISOString();

  const truth = assertValidationTruth(rec);
  if (!truth.ok) {
    return { record: rec, error: truth.code || "TRUTH_VIOLATION" };
  }

  records.set(modelId, rec);
  persistRecord(rec);
  return { record: rec, error: null };
}

/** Detect stale VALIDATED records past staleAfterMs on latest pass evidence */
export function checkValidationStale(modelId: string): {
  stale: boolean;
  record: ModelValidationRecord;
} {
  const rec = getModelValidation(modelId);
  if (rec.state !== "VALIDATED") return { stale: false, record: rec };

  const latestPass = [...rec.evidence].reverse().find((e) => e.kind === "validation_pass");
  if (!latestPass?.staleAfterMs) return { stale: false, record: rec };

  const ageMs = Date.now() - Date.parse(latestPass.at);
  if (ageMs <= latestPass.staleAfterMs) return { stale: false, record: rec };

  const staleEvidence = createValidationEvidence(modelId, "validation_stale", {
    outcome: "NOT_VALIDATED",
    summary: `Validation stale after ${latestPass.staleAfterMs}ms`,
  });
  const applied = applyValidationEvidence(modelId, staleEvidence);
  return { stale: true, record: applied.record };
}

export function resetValidationCacheForTests() {
  records.clear();
  hydrated = false;
}
