import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Canonical LOCALAPPDATA data root — aligned with osSession jobs/session authority. */
export function resolveSciDataRoot(): string {
  if (process.env.SCIOS_USER_DATA) {
    return path.join(path.resolve(process.env.SCIOS_USER_DATA), "SCI OS X10", "data");
  }
  const localApp =
    process.env.LOCALAPPDATA ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local")
      : path.join(os.homedir(), ".local", "share"));
  return path.join(localApp, "SCI OS X10", "data");
}

/** Wave B-004 canonical vertical-slice durable store. */
export function resolveVerticalSliceStateDir(): string {
  if (process.env.SCIOS_STATE_DIR) {
    return path.resolve(process.env.SCIOS_STATE_DIR);
  }
  return path.join(resolveSciDataRoot(), "vertical-slice");
}

/** Pre-B-004 legacy path — read-only migration source. */
export function resolveLegacyVerticalSliceStateDir(): string {
  const localApp =
    process.env.LOCALAPPDATA ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local")
      : path.join(os.homedir(), ".local", "share"));
  return path.join(localApp, "SCI OS X10", "state", "vertical-slice");
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Atomic write: temp → rename (matches osSession job persistence). */
export function atomicWriteUtf8(filePath: string, content: string): void {
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fs.renameSync(tmp, filePath);
}
