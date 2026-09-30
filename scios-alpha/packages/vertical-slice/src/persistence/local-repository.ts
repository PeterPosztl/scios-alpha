/**
 * B-010 local-durable repository — file-backed truth (B-002/B-004).
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { atomicWriteUtf8, resolveSciDataRoot } from "../data-root.js";
import { loadPersistedRuns } from "../local-durable.js";
import type {
  DomainStateRepository,
  DomainStateRecord,
  EvidenceRepository,
  EvidenceRecord,
  ExperienceSpecRecord,
  ExperienceSpecRepository,
  JobAttemptRecord,
  JobAttemptRepository,
  JobRecord,
  JobRepository,
  LineageRecord,
  LineageRepository,
} from "./repository-types.js";

function jobsDir() {
  return path.join(resolveSciDataRoot(), "jobs");
}

function pgMirrorDir() {
  return path.join(resolveSciDataRoot(), "persistence-local");
}

function ensureMirrorDir(sub: string) {
  const dir = path.join(pgMirrorDir(), sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJsonDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as T);
}

export function createLocalJobRepository(): JobRepository {
  return {
    async upsert(job) {
      const fp = path.join(jobsDir(), `${job.jobId}.json`);
      if (!fs.existsSync(jobsDir())) fs.mkdirSync(jobsDir(), { recursive: true });
      const existing = fs.existsSync(fp)
        ? (JSON.parse(fs.readFileSync(fp, "utf8")) as Record<string, unknown>)
        : {};
      atomicWriteUtf8(fp, JSON.stringify({ ...existing, ...job.payload, jobId: job.jobId }, null, 2));
    },
    async get(jobId) {
      const fp = path.join(jobsDir(), `${jobId}.json`);
      if (!fs.existsSync(fp)) return null;
      const payload = JSON.parse(fs.readFileSync(fp, "utf8")) as Record<string, unknown>;
      return {
        jobId,
        payload,
        state: String(payload.state || "QUEUED"),
        lifecycleState: (payload.lifecycleState as string) || null,
        currentAttempt: Number(payload.currentAttempt || 1),
        maxAttempts: Number(payload.maxAttempts || 3),
        correlationId: (payload.correlationId as string) || null,
        actor: (payload.actorContext as Record<string, unknown>) || null,
      };
    },
    async count() {
      if (!fs.existsSync(jobsDir())) return 0;
      return fs.readdirSync(jobsDir()).filter((f) => f.endsWith(".json")).length;
    },
  };
}

export function createLocalJobAttemptRepository(): JobAttemptRepository {
  return {
    async insert(attempt) {
      const dir = ensureMirrorDir("job-attempts");
      atomicWriteUtf8(path.join(dir, `${attempt.attemptId}.json`), JSON.stringify(attempt, null, 2));
    },
    async listForJob(jobId) {
      return readJsonDir<JobAttemptRecord>(ensureMirrorDir("job-attempts")).filter(
        (a) => a.jobId === jobId
      );
    },
  };
}

export function createLocalEvidenceRepository(): EvidenceRepository {
  return {
    async insert(evidence) {
      const dir = ensureMirrorDir("evidence");
      atomicWriteUtf8(path.join(dir, `${evidence.evidenceId}.json`), JSON.stringify(evidence, null, 2));
    },
    async count() {
      return readJsonDir<EvidenceRecord>(ensureMirrorDir("evidence")).length;
    },
  };
}

export function createLocalLineageRepository(): LineageRepository {
  return {
    async upsert(lineage) {
      const dir = ensureMirrorDir("lineage");
      atomicWriteUtf8(path.join(dir, `${lineage.lineageId}.json`), JSON.stringify(lineage, null, 2));
    },
    async count() {
      const runs = loadPersistedRuns<Record<string, unknown>>();
      return runs.size + readJsonDir<LineageRecord>(ensureMirrorDir("lineage")).length;
    },
  };
}

export function createLocalDomainStateRepository(): DomainStateRepository {
  return {
    async upsert(state) {
      const dir = ensureMirrorDir("domain-state");
      atomicWriteUtf8(path.join(dir, `${state.domainKey}.json`), JSON.stringify(state, null, 2));
    },
    async get(domainKey) {
      const fp = path.join(ensureMirrorDir("domain-state"), `${domainKey}.json`);
      if (!fs.existsSync(fp)) return null;
      return JSON.parse(fs.readFileSync(fp, "utf8")) as DomainStateRecord;
    },
  };
}

export function createLocalExperienceSpecRepository(): ExperienceSpecRepository {
  return {
    async upsert(spec) {
      const dir = ensureMirrorDir("experience-specs");
      atomicWriteUtf8(path.join(dir, `${spec.specId}.json`), JSON.stringify(spec, null, 2));
    },
    async count() {
      return readJsonDir<ExperienceSpecRecord>(ensureMirrorDir("experience-specs")).length;
    },
  };
}

export function newLocalEvidenceId() {
  return `ev_${randomUUID()}`;
}

export function localBackupExportPath() {
  return path.join(resolveSciDataRoot(), "backups", "local-export.json");
}
