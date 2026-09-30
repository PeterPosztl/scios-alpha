import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OsEnvironment } from "./index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "os-environment");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

const env = new OsEnvironment();
write("shell-registry.json", env.shell);
write("application-registry.json", env.applications);
write("workspace-registry.json", env.workspaces);
write("service-registry.json", env.services);
write("command-registry.json", env.commands);
write("update-model.json", {
  schema: "sci-os-update-model/v1",
  states: [
    "UPDATE_AVAILABLE",
    "DOWNLOADING",
    "VERIFYING",
    "READY_TO_INSTALL",
    "INSTALLING",
    "ROLLBACK",
  ],
  autoInstallUnverified: false,
  codeSigning: "NOT_AVAILABLE",
  label: "ALPHA_NON_PRODUCTION",
});
write("environment-snapshot.json", env.snapshot());

console.log(
  JSON.stringify({ ok: true, out: "diagnostics-export/os-environment", snapshot: env.snapshot() }, null, 2)
);
