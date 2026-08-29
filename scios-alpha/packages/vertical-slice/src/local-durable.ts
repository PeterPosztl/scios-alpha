import fs from "node:fs";
import path from "node:path";
import {
  atomicWriteUtf8,
  ensureDir,
  resolveLegacyVerticalSliceStateDir,
  resolveVerticalSliceStateDir,
} from "./data-root.js";

const MAX_RUNS = 50;

export function resolveStateDir(): string {
  return resolveVerticalSliceStateDir();
}

function runsPath(dir: string): string {
  return path.join(dir, "runs-index.json");
}

function runFile(dir: string, runId: string): string {
  const safe = String(runId || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  const root = path.resolve(dir, "runs");
  const fp = path.resolve(root, `${safe}.json`);
  const rel = path.relative(root, fp);
  if (!rel || path.isAbsolute(rel) || rel === ".." || rel.startsWith(`..${path.sep}`)) {
    throw new Error("runId_path_escape");
  }
  return fp;
}

export function ensureStateDir(dir = resolveStateDir()): string {
  ensureDir(path.join(dir, "runs"));
  return dir;
}

export type DurableRunSummary = {
  runId: string;
  tipHash: string | null;
  status: string;
  savedAt: string;
};

function readIndex(dir: string): DurableRunSummary[] {
  const indexPath = runsPath(dir);
  if (!fs.existsSync(indexPath)) return [];
  return JSON.parse(fs.readFileSync(indexPath, "utf8")) as DurableRunSummary[];
}

function hydrateFromDir<T>(dir: string, out: Map<string, T>): void {
  const index = readIndex(dir);
  for (const row of index.slice(0, MAX_RUNS)) {
    const fp = runFile(dir, row.runId);
    if (!fs.existsSync(fp)) continue;
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as T;
    out.set(row.runId, parsed);
  }
}

/** Best-effort migrate legacy state/vertical-slice → data/vertical-slice. */
function migrateLegacyRunsIfNeeded(): void {
  const current = resolveStateDir();
  const legacy = resolveLegacyVerticalSliceStateDir();
  if (path.resolve(current) === path.resolve(legacy)) return;
  if (readIndex(current).length > 0) return;
  if (readIndex(legacy).length === 0) return;

  ensureStateDir(current);
  const legacyIndexPath = runsPath(legacy);
  const currentIndexPath = runsPath(current);
  if (fs.existsSync(legacyIndexPath) && !fs.existsSync(currentIndexPath)) {
    fs.copyFileSync(legacyIndexPath, currentIndexPath);
  }
  const legacyRuns = path.join(legacy, "runs");
  const currentRuns = path.join(current, "runs");
  if (!fs.existsSync(legacyRuns)) return;
  for (const name of fs.readdirSync(legacyRuns)) {
    const src = path.join(legacyRuns, name);
    const dst = path.join(currentRuns, name);
    if (!fs.existsSync(dst) && fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

export function persistRun(
  runId: string,
  result: unknown,
): { ok: boolean; state: "PERSISTED" | "PERSISTENCE_DEGRADED"; error?: string } {
  try {
    migrateLegacyRunsIfNeeded();
    const dir = ensureStateDir();
    atomicWriteUtf8(runFile(dir, runId), JSON.stringify(result));
    const indexPath = runsPath(dir);
    let index: DurableRunSummary[] = readIndex(dir);
    const tipHash =
      result &&
      typeof result === "object" &&
      "lineage" in result &&
      result.lineage &&
      typeof result.lineage === "object" &&
      "tipHash" in result.lineage
        ? String((result.lineage as { tipHash?: string }).tipHash ?? null)
        : null;
    const status =
      result &&
      typeof result === "object" &&
      "outcome" in result &&
      result.outcome &&
      typeof result.outcome === "object" &&
      "status" in result.outcome
        ? String((result.outcome as { status?: string }).status)
        : "UNKNOWN";
    index = [
      { runId, tipHash, status, savedAt: new Date().toISOString() },
      ...index.filter((r) => r.runId !== runId),
    ].slice(0, MAX_RUNS);
    atomicWriteUtf8(indexPath, JSON.stringify(index, null, 2));
    return { ok: true, state: "PERSISTED" };
  } catch (e) {
    return {
      ok: false,
      state: "PERSISTENCE_DEGRADED",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function loadPersistedRuns<T>(): Map<string, T> {
  const out = new Map<string, T>();
  try {
    migrateLegacyRunsIfNeeded();
    hydrateFromDir(resolveStateDir(), out);
    if (out.size === 0) {
      hydrateFromDir(resolveLegacyVerticalSliceStateDir(), out);
    }
  } catch {
    return out;
  }
  return out;
}
