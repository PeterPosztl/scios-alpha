import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";
import type { CapabilityNode, CapabilityState } from "./types.js";

export class SystemInventoryEngine {
  constructor(private appRoot: string) {}

  collect() {
    const pkg = JSON.parse(readFileSync(join(this.appRoot, "package.json"), "utf8"));
    const packages = existsSync(join(this.appRoot, "packages"))
      ? readdirSync(join(this.appRoot, "packages")).filter((n) =>
          existsSync(join(this.appRoot, "packages", n))
        )
      : [];
    const apps = existsSync(join(this.appRoot, "apps"))
      ? readdirSync(join(this.appRoot, "apps"))
      : [];

    const nodeV = spawnSync("node", ["--version"], { encoding: "utf8" });
    const pnpmV = spawnSync("pnpm", ["--version"], { encoding: "utf8", shell: true });
    const docker = spawnSync("docker", ["info"], { encoding: "utf8", shell: true, timeout: 8000 });

    return {
      at: new Date().toISOString(),
      machine: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        hostnameHash: createHash("sha256").update(os.hostname()).digest("hex").slice(0, 16),
        userInfo: { username: os.userInfo().username },
      },
      repository: {
        name: pkg.name,
        packageManager: pkg.packageManager,
        packages,
        apps,
        hasInstaller: existsSync(join(this.appRoot, "installer/scripts/start-sci-os.cjs")),
        hasBoot: existsSync(join(this.appRoot, "scripts/boot/index.mjs")),
        hasMetaRecovery: true,
      },
      runtimes: {
        node: {
          version: (nodeV.stdout || "").trim(),
          usable: nodeV.status === 0,
        },
        pnpm: {
          version: (pnpmV.stdout || "").trim(),
          usable: pnpmV.status === 0,
        },
        docker: {
          usable: docker.status === 0,
          detail: docker.status === 0 ? "AVAILABLE" : "UNAVAILABLE_OR_STOPPED",
        },
        electron: { usable: false, detail: "ABSENT" },
      },
      infrastructure: {
        postgresql: process.env.DATABASE_URL ? "CONFIGURED" : "NOT_CONFIGURED",
        redis: process.env.REDIS_URL ? "CONFIGURED" : "NOT_CONFIGURED",
      },
      fingerprint: createHash("sha256")
        .update(`${os.platform()}|${os.arch()}|${pkg.name}|${pkg.packageManager}`)
        .digest("hex")
        .slice(0, 24),
    };
  }
}

export class SystemCapabilityGraph {
  build(inventory: ReturnType<SystemInventoryEngine["collect"]>): CapabilityNode[] {
    const state = (ok: boolean, degraded = false): CapabilityState =>
      ok ? (degraded ? "AVAILABLE_BUT_DEGRADED" : "AVAILABLE") : "MISSING";

    return [
      {
        id: "BootstrapKernel",
        provider: "installer/scripts",
        required: true,
        dependencies: [],
        fallbackProviders: ["scripts/boot"],
        state: state(inventory.repository.hasInstaller),
        evidence: ["installer/scripts/start-sci-os.cjs"],
        safeModeBehavior: "required",
      },
      {
        id: "StartupRecoveryPack",
        provider: "installer+boot",
        required: true,
        dependencies: ["BootstrapKernel"],
        fallbackProviders: [],
        state: state(inventory.repository.hasBoot && inventory.repository.hasInstaller),
        evidence: ["SCI-OS-Start.bat", "pnpm sci:start"],
        safeModeBehavior: "required",
      },
      {
        id: "NodeRuntime",
        provider: "system-or-bundled",
        required: true,
        dependencies: [],
        fallbackProviders: [],
        state: state(inventory.runtimes.node.usable),
        evidence: [inventory.runtimes.node.version || "missing"],
        safeModeBehavior: "required",
      },
      {
        id: "ControlPlaneBackend",
        provider: "apps/control-plane-api",
        required: true,
        dependencies: ["NodeRuntime", "StartupRecoveryPack"],
        fallbackProviders: [],
        state: state(inventory.repository.apps.includes("control-plane-api")),
        healthProbe: "http://127.0.0.1:5200/healthz",
        evidence: ["apps/control-plane-api"],
        safeModeBehavior: "optional",
      },
      {
        id: "CockpitHttp",
        provider: "apps/cockpit-ui",
        required: true,
        dependencies: ["ControlPlaneBackend"],
        fallbackProviders: [],
        state: state(inventory.repository.apps.includes("cockpit-ui")),
        healthProbe: "http://127.0.0.1:5230/healthz",
        evidence: ["apps/cockpit-ui"],
        safeModeBehavior: "optional",
      },
      {
        id: "VerticalSlice",
        provider: "packages/vertical-slice",
        required: true,
        dependencies: ["NodeRuntime"],
        fallbackProviders: [],
        state: state(inventory.repository.packages.includes("vertical-slice")),
        evidence: ["packages/vertical-slice"],
        safeModeBehavior: "optional",
      },
      {
        id: "DesktopElectron",
        provider: "apps/desktop",
        required: false,
        dependencies: ["CockpitHttp"],
        fallbackProviders: ["CockpitHttp"],
        state: "MISSING",
        evidence: ["ABSENT"],
        safeModeBehavior: "disabled",
      },
      {
        id: "PostgreSQL",
        provider: "external-or-docker",
        required: false,
        dependencies: [],
        fallbackProviders: [],
        state:
          inventory.infrastructure.postgresql === "CONFIGURED"
            ? "UNKNOWN"
            : "MISSING",
        evidence: [inventory.infrastructure.postgresql],
        safeModeBehavior: "disabled",
      },
      {
        id: "RedisQueue",
        provider: "external-or-docker",
        required: false,
        dependencies: [],
        fallbackProviders: [],
        state:
          inventory.infrastructure.redis === "CONFIGURED" ? "UNKNOWN" : "MISSING",
        evidence: [inventory.infrastructure.redis],
        safeModeBehavior: "disabled",
      },
      {
        id: "QueueWorkers",
        provider: "bullmq-absent",
        required: false,
        dependencies: ["RedisQueue"],
        fallbackProviders: [],
        state: "MISSING",
        evidence: ["ABSENT_QUEUE_WORKERS"],
        safeModeBehavior: "disabled",
      },
      {
        id: "MetaRecoveryEngine",
        provider: "packages/meta-recovery",
        required: true,
        dependencies: ["BootstrapKernel"],
        fallbackProviders: [],
        state: "AVAILABLE",
        evidence: ["packages/meta-recovery"],
        safeModeBehavior: "required",
      },
    ];
  }
}

export class DependencyGraphEngine {
  toEdges(nodes: CapabilityNode[]) {
    const edges = [];
    for (const n of nodes) {
      for (const d of n.dependencies) {
        edges.push({ from: d, to: n.id, relation: "REQUIRES" });
      }
    }
    return { nodes: nodes.map((n) => n.id), edges };
  }

  affectedUpstream(failedId: string, nodes: CapabilityNode[]): string[] {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const affected = new Set<string>([failedId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (n.dependencies.some((d) => affected.has(d)) && !affected.has(n.id)) {
          affected.add(n.id);
          changed = true;
        }
      }
    }
    return [...affected].filter((id) => byId.has(id));
  }
}

export function writeJson(dir: string, name: string, data: unknown) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function fileMtime(path: string) {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return null;
  }
}
