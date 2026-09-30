/**
 * Emit simulated ALPHA track-record JSON.
 * Not live proof. Not READY.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEclDilRuntime, ECL_DIL_HONESTY, SCI_SYSTEM_IDENTITY } from "./index.js";

const rt = createEclDilRuntime();
const out = {
  schema: "sci-os-track-record-alpha/v1",
  label: "ALPHA_NON_PRODUCTION" as const,
  at: new Date().toISOString(),
  identity: SCI_SYSTEM_IDENTITY.identity,
  ready: false as const,
  holeless: false as const,
  autoTrade: false as const,
  productionEligible: false as const,
  winRateClaim: null,
  liveCalibration: "UNKNOWN" as const,
  honesty: ECL_DIL_HONESTY,
  calibration: rt.calibration(),
  trackRecord: rt.trackRecord(),
  note: "Seeded simulated closed-loop. Live market outcomes are not in this file. Not a production track-record.",
};
const json = JSON.stringify(out, null, 2) + "\n";
const dest = join(dirname(fileURLToPath(import.meta.url)), "../../../diagnostics-export/track-record-alpha.json");
writeFileSync(dest, json, "utf8");
process.stdout.write(dest + "\n");
