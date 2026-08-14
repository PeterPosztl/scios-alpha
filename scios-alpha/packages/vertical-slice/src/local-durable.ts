import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_RUNS = 50;

export function resolveStateDir(): string {
  if (process.env.SCIOS_STATE_DIR) {
    return path.resolve(process.env.SCIOS_STATE_DIR);
  }
  const localApp =
    process.env.LOCALAPPDATA ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local")
      : path.join(os.homedir(), ".local", "share"));
  return path.join(localApp, "SCI OS X10", "state", "vertical-slice");
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
  fs.mkdirSync(path.join(dir, "runs"), { recursive: true });
  return dir;
}

export type DurableRunSummary = {
  runId: string;
  tipHash: string | null;
  status: string;
  savedAt: string;
};

export function persistRun(
  runId: string,
  result: unknown
): { ok: boolean; state: "PERSISTED" | "PERSISTENCE_DEGRADED"; error?: string } {
  try {
    const dir = ensureStateDir();
    fs.writeFileSync(runFile(dir, runId), JSON.stringify(result), "utf8");
    const indexPath = runsPath(dir);
    let index: DurableRunSummary[] = [];
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as DurableRunSummary[];
    }
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
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
    return { ok: true, state: "PERSISTED" };
  } catch (e) {
    // Local durable is best-effort; never fail the live slice — but surface state.
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
    const dir = resolveStateDir();
    const indexPath = runsPath(dir);
    if (!fs.existsSync(indexPath)) return out;
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as DurableRunSummary[];
    for (const row of index.slice(0, MAX_RUNS)) {
      const fp = runFile(dir, row.runId);
      if (!fs.existsSync(fp)) continue;
      const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as T;
      out.set(row.runId, parsed);
    }
  } catch {
    return out;
  }
  return out;
}
