import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCapabilityRegistry,
  summarizeCapabilities,
} from "../../product-kernel/src/capability-registry.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const reg = loadCapabilityRegistry(appRoot);
const summary = summarizeCapabilities(reg);

const plan = (reg.capabilities || [])
  .filter((c) =>
    ["MISSING", "STUB", "UNPROVEN", "DISCONNECTED", "PARTIAL"].includes(
      c.implementationStatus
    )
  )
  .map((c) => ({
    capabilityId: c.capabilityId,
    status: c.implementationStatus,
    provider: c.implementationProvider,
    next: c.implementationStatus === "MISSING"
      ? "implement_or_connect"
      : c.implementationStatus === "STUB"
        ? "replace_stub_with_integration"
        : c.implementationStatus === "UNPROVEN"
          ? "add_runtime_proof"
          : "close_partial_gaps",
  }));

const out = {
  schema: "sci-os-capability-closure/v1",
  label: "ALPHA_NON_PRODUCTION",
  summary,
  orderedPlan: plan,
  note: "Do not duplicate engines — connect existing providers",
};

console.log(JSON.stringify(out, null, 2));
