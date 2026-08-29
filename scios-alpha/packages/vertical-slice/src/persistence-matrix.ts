import { resolveSciDataRoot, resolveVerticalSliceStateDir } from "./data-root.js";

export type PersistenceClassification =
  | "DURABLE"
  | "EPHEMERAL"
  | "PROFILE_DISABLED"
  | "OPTIONAL";

export type PersistenceStateEntry = {
  classification: PersistenceClassification;
  store: string | null;
  restartSafe: boolean | null;
  atomicWrite?: boolean;
  externalDependency?: string;
  note?: string;
};

export type PersistenceStateMatrix = {
  schema: "sci-os-persistence-state-matrix/v1";
  label: "ALPHA_NON_PRODUCTION";
  at: string;
  authority: string;
  postgresDeferred: "FD-002";
  dataRoot: string;
  verticalSliceStore: string;
  states: Record<string, PersistenceStateEntry>;
};

/** Canonical persistence truth matrix — UI must not imply PG when PROFILE_DISABLED. */
export function getPersistenceStateMatrix(): PersistenceStateMatrix {
  const dataRoot = resolveSciDataRoot();
  const vsStore = resolveVerticalSliceStateDir();

  return {
    schema: "sci-os-persistence-state-matrix/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    authority: "packages/vertical-slice/src/persistence-matrix.ts",
    postgresDeferred: "FD-002",
    dataRoot,
    verticalSliceStore: vsStore,
    states: {
      session: {
        classification: "DURABLE",
        store: `${dataRoot}/session/`,
        restartSafe: true,
        atomicWrite: true,
        note: "File-backed via osSession",
      },
      jobs: {
        classification: "DURABLE",
        store: `${dataRoot}/jobs/`,
        restartSafe: true,
        atomicWrite: true,
        note: "CF11 Wave B-002 proven",
      },
      verticalSliceRuns: {
        classification: "DURABLE",
        store: `${vsStore}/runs/`,
        restartSafe: true,
        atomicWrite: true,
        note: "Wave B-004 — local-durable with cross-process hydrate",
      },
      notifications: {
        classification: "EPHEMERAL",
        store: "in-process",
        restartSafe: false,
      },
      auditLog: {
        classification: "EPHEMERAL",
        store: "in-process governance-engine",
        restartSafe: false,
        note: "Target C durable audit — not Beta scope",
      },
      featureStore: {
        classification: "EPHEMERAL",
        store: "in-process",
        restartSafe: false,
      },
      postgres: {
        classification: "PROFILE_DISABLED",
        store: null,
        restartSafe: null,
        externalDependency: "FD-002",
        note: "Honest deferral — local-durable is Beta truth",
      },
      redis: {
        classification: "OPTIONAL",
        store: null,
        restartSafe: null,
        note: "Queue workers disabled when REDIS_URL unset",
      },
    },
  };
}
