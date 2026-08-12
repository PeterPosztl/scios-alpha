#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MetaRecoveryController } from "./controller.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const proveOnly = args.includes("--prove");
const resume = args.includes("--resume");
const faultTest = args.includes("--fault-test");

function resolveAppRoot(): string {
  if (process.env.SCI_APP_ROOT) return resolve(process.env.SCI_APP_ROOT);
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const starter = join(dir, "installer", "scripts", "start-sci-os.cjs");
    const pkgPath = join(dir, "package.json");
    if (existsSync(starter) && existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "scios-alpha" || pkg.private === true) return dir;
      } catch {
        /* continue */
      }
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: packages/meta-recovery -> repo root
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

const appRoot = resolveAppRoot();

async function main() {
  if (faultTest) {
    const { runFaultMatrix } = await import("./fault-matrix.js");
    const code = await runFaultMatrix(appRoot);
    process.exit(code);
  }

  const result = await new MetaRecoveryController().run({
    appRoot,
    dryRun,
    proveOnly,
    resume,
  });

  console.log(
    JSON.stringify(
      {
        correlationId: result.correlationId,
        verdict: result.verdict,
        state: result.state,
        verification: result.verification,
        attempts: result.attempts.length,
        applied: result.applied.map((a) => a.recipeId),
        rejected: result.rejected.map((a) => a.recipeId),
        outDir: result.outDir,
      },
      null,
      2
    )
  );

  if (result.verdict === "SYSTEM_NO_GO") process.exit(2);
  if (result.verdict === "EXTERNAL_BLOCKER_PROVEN") process.exit(3);
  if (result.verdict === "SYSTEM_DEGRADED") process.exit(0);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
