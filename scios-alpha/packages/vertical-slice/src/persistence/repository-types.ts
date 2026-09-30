/**
 * B-010 repository interfaces — local + PostgreSQL backends.
 */
export interface TransactionContext {
  id: string;
  store: "local" | "postgres";
}

export interface JobRecord {
  jobId: string;
  payload: Record<string, unknown>;
  state: string;
  lifecycleState?: string | null;
  currentAttempt: number;
  maxAttempts: number;
  correlationId?: string | null;
  actor?: Record<string, unknown> | null;
}

export interface JobRepository {
  upsert(job: JobRecord): Promise<void>;
  get(jobId: string): Promise<JobRecord | null>;
  count(): Promise<number>;
}

export interface JobAttemptRecord {
  attemptId: string;
  jobId: string;
  attemptNumber: number;
  state: string;
  error?: unknown;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface JobAttemptRepository {
  insert(attempt: JobAttemptRecord): Promise<void>;
  listForJob(jobId: string): Promise<JobAttemptRecord[]>;
}

export interface EvidenceRecord {
  evidenceId: string;
  jobId?: string | null;
  runId?: string | null;
  kind: string;
  payload: Record<string, unknown>;
}

export interface EvidenceRepository {
  insert(evidence: EvidenceRecord): Promise<void>;
  count(): Promise<number>;
}

export interface LineageRecord {
  lineageId: string;
  runId: string;
  tipHash?: string | null;
  payload: Record<string, unknown>;
}

export interface LineageRepository {
  upsert(lineage: LineageRecord): Promise<void>;
  count(): Promise<number>;
}

export interface DomainStateRecord {
  domainKey: string;
  payload: Record<string, unknown>;
  version: number;
}

export interface DomainStateRepository {
  upsert(state: DomainStateRecord): Promise<void>;
  get(domainKey: string): Promise<DomainStateRecord | null>;
}

export interface ExperienceSpecRecord {
  specId: string;
  objectId?: string | null;
  roleId?: string | null;
  compilerVersion?: string | null;
  payload: Record<string, unknown>;
}

export interface ExperienceSpecRepository {
  upsert(spec: ExperienceSpecRecord): Promise<void>;
  count(): Promise<number>;
}

export interface PersistenceRepositories {
  jobs: JobRepository;
  jobAttempts: JobAttemptRepository;
  evidence: EvidenceRepository;
  lineage: LineageRepository;
  domainState: DomainStateRepository;
  experienceSpecs: ExperienceSpecRepository;
}
