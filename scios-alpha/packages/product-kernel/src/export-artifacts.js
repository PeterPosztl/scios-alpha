/**
 * Export Product Kernel registries to diagnostics-export/product-kernel/
 * File export ≠ product READY. ALPHA_NON_PRODUCTION
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProductKernel } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "product-kernel");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

const k = new ProductKernel(ROOT);
const snap = k.snapshot();

write("object-registry.json", k.objects);
write("action-registry.json", k.actions);
write("workflow-registry.json", k.workflows);
write("capability-registry.json", k.capabilities);
write("professional-role-registry.json", k.roles);
write("workspace-map.json", k.workspaces);
write("navigation-registry.json", k.navigation);
write("command-registry.json", k.commands);
write("capability-graph.json", k.capabilityGraph());
write("product-gap-report.json", k.gapReport());
write("kernel-snapshot.json", snap);
write("maturity-report.json", {
  schema: "sci-os-maturity-report/v1",
  label: "ALPHA_NON_PRODUCTION",
  at: new Date().toISOString(),
  capabilitySummary: snap.capabilitySummary,
  workflows: k.workflows.workflows.map((w) => ({
    id: w.workflowId,
    status: w.status,
    maturityTarget: w.maturityTarget || null,
  })),
});
write("golden-workflows.json", {
  schema: "sci-os-golden-workflows/v1",
  workflows: k.workflows.workflows,
});
write("ux-scorecard.json", {
  schema: "sci-os-ux-scorecard/v1",
  label: "ALPHA_NON_PRODUCTION",
  note: "Measured scores require live UX rubric — placeholder until final-closure run",
  target: 85,
  measured: null,
});
write("product-e2e-proof.json", {
  schema: "sci-os-product-e2e-proof/v1",
  status: "DEFERRED_TO_FINAL_CLOSURE",
});
write("product-foundation-signoff.json", {
  schema: "sci-os-product-foundation-signoff/v1",
  at: new Date().toISOString(),
  label: "ALPHA_NON_PRODUCTION",
  verdict: "PRODUCT_KERNEL_DEGRADED",
  reasons: [
    "Product kernel registries exportable",
    "Universal shell / clean-install packaging still incomplete",
    "File export ≠ FOUNDATION PRODUCT READY",
  ],
  snapshot: snap,
  readyRequires: [
    "kernel operational",
    "P0 preserved",
    "GW#1 complete with live data",
    "E2E proof PASS",
    "no fake/static results",
  ],
});

console.log(
  JSON.stringify(
    {
      ok: true,
      out: "diagnostics-export/product-kernel",
      verdict: "PRODUCT_KERNEL_DEGRADED",
      snapshot: snap,
    },
    null,
    2
  )
);
