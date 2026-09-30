import type { CapabilityNode } from "./types.js";

/** Expected vs actual startup twin */
export class StartupDigitalTwin {
  expected() {
    return {
      requiredComponents: [
        "NodeRuntime",
        "BootstrapKernel",
        "StartupRecoveryPack",
        "ControlPlaneBackend",
        "CockpitHttp",
        "VerticalSlice",
        "MetaRecoveryEngine",
      ],
      optionalComponents: ["DesktopElectron", "PostgreSQL", "RedisQueue", "QueueWorkers"],
      expectedPorts: [3000, 4000],
      allowedDegraded: ["PostgreSQL", "RedisQueue", "QueueWorkers", "DesktopElectron"],
      maxStartupMs: 180000,
    };
  }

  diff(nodes: CapabilityNode[]) {
    const exp = this.expected();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const missingRequired = exp.requiredComponents.filter((id) => {
      const n = byId.get(id);
      return !n || n.state === "MISSING" || n.state === "CORRUPTED";
    });
    const degradedOptional = exp.optionalComponents.filter((id) => {
      const n = byId.get(id);
      return !n || n.state !== "AVAILABLE";
    });
    const incompatible = nodes.filter((n) => n.state === "INSTALLED_BUT_INCOMPATIBLE").map((n) => n.id);
    return {
      at: new Date().toISOString(),
      expected: exp,
      actual: Object.fromEntries(nodes.map((n) => [n.id, n.state])),
      missingRequired,
      degradedOptional,
      incompatible,
      repairTasks: [
        ...missingRequired.map((id) => ({
          type: "restore_required",
          capability: id,
          priority: 1,
        })),
        ...degradedOptional.map((id) => ({
          type: "document_optional_gap",
          capability: id,
          priority: 3,
        })),
      ],
    };
  }
}
