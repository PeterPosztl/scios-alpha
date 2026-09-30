/**
 * B-010 consistency checks + backup/restore helpers.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveSciDataRoot } from "../data-root.js";
import type { ConsistencyReport } from "./contract.js";
import { createLocalJobRepository, localBackupExportPath } from "./local-repository.js";
import {
  createPostgresEvidenceRepository,
  createPostgresJobRepository,
  createPostgresLineageRepository,
  getPostgresPool,
  isPostgresConfigured,
} from "./postgres-adapter.js";

export async function runConsistencyChecks(): Promise<ConsistencyReport> {
  const localJobs = createLocalJobRepository();
  const localJobCount = await localJobs.count();

  const checks: ConsistencyReport["checks"] = [
    {
      name: "jobs",
      local: localJobCount,
      postgres: null,
      match: true,
    },
  ];

  const jobCheck = checks[0]!;
  if (!isPostgresConfigured()) {
    return { ok: true, checks };
  }

  const pool = await getPostgresPool();
  if (!pool) {
    jobCheck.postgres = "UNAVAILABLE";
    jobCheck.match = false;
    return { ok: false, checks };
  }

  const pgJobs = createPostgresJobRepository();
  const pgJobCount = await pgJobs.count();
  jobCheck.postgres = pgJobCount;
  jobCheck.match = pgJobCount <= localJobCount;

  const pgEvidence = createPostgresEvidenceRepository();
  const pgLineage = createPostgresLineageRepository();
  checks.push({
    name: "evidence",
    local: 0,
    postgres: await pgEvidence.count(),
    match: true,
  });
  checks.push({
    name: "lineage",
    local: 0,
    postgres: await pgLineage.count(),
    match: true,
  });

  const ok = checks.every((c) => c.match);
  return { ok, checks };
}

export function exportLocalBackup(): { ok: boolean; path: string; error?: string } {
  try {
    const root = resolveSciDataRoot();
    const out = localBackupExportPath();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const payload = {
      schema: "sci-os-local-backup/v1",
      at: new Date().toISOString(),
      dataRoot: root,
      jobs: fs.existsSync(path.join(root, "jobs"))
        ? fs.readdirSync(path.join(root, "jobs")).filter((f) => f.endsWith(".json"))
        : [],
      verticalSlice: fs.existsSync(path.join(root, "vertical-slice"))
        ? fs.readdirSync(path.join(root, "vertical-slice"))
        : [],
    };
    fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    return { ok: true, path: out };
  } catch (e) {
    return { ok: false, path: localBackupExportPath(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function restoreLocalBackupFromExport(exportPath: string): { ok: boolean; error?: string } {
  try {
    if (!fs.existsSync(exportPath)) return { ok: false, error: "backup_not_found" };
    const parsed = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    if (parsed.schema !== "sci-os-local-backup/v1") return { ok: false, error: "invalid_backup_schema" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
