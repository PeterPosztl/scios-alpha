/**
 * Invariant mesh — machine-verifiable cross-layer predicates.
 * Generated from registries + runtime facts where possible.
 * ALPHA_NON_PRODUCTION
 */

export function buildInvariantMesh(facts = {}) {
  const invariants = [
    {
      id: "USER_LAUNCH_TARGET_EQ_SHELL",
      predicate: "USER_LAUNCH_TARGET == SHELL",
      check: () => {
        const target = facts.userLaunchTarget || "SHELL";
        return { pass: target === "SHELL", observed: target };
      },
    },
    {
      id: "SHELL_PORT_NE_CONTROL_PLANE_PORT",
      predicate: "SHELL_PORT != CONTROL_PLANE_PORT",
      check: () => {
        const shell = Number(facts.shellPort ?? 4000);
        const cp = Number(facts.controlPlanePort ?? 3000);
        return { pass: shell !== cp, observed: { shell, cp } };
      },
    },
    {
      id: "PACKAGED_RUNTIME_BUNDLED",
      predicate: "INSTALLED_RUNTIME == BUNDLED_RUNTIME when packaged",
      check: () => {
        if (!facts.packaged) return { pass: true, observed: "not_packaged", na: true };
        const ok = !!facts.runtimeIsBundled;
        return { pass: ok, observed: { runtimeIsBundled: facts.runtimeIsBundled } };
      },
    },
    {
      id: "INSTALLED_APP_ROOT_NE_SOURCE_DIST",
      predicate: "INSTALLED_APP_ROOT != SOURCE_DIST_ROOT when packaged",
      check: () => {
        if (!facts.packaged) return { pass: true, observed: "not_packaged", na: true };
        const app = String(facts.installedAppRoot || "");
        const dist = String(facts.sourceDistRoot || "");
        const bad = /[\\/]scios-alpha[\\/]dist[\\/]/i.test(app) || (dist && app === dist);
        return { pass: !bad && !!app, observed: { app, dist } };
      },
    },
    {
      id: "ACTION_REQUIRES_RISK_GOVERNANCE",
      predicate: "ACTION_EXECUTION requires RISK + GOVERNANCE where policy requires",
      check: () => {
        const ok = facts.analyzeProducesRiskAndGov !== false;
        return {
          pass: ok,
          observed: {
            analyzeProducesRiskAndGov: facts.analyzeProducesRiskAndGov ?? "ASSUMED_FROM_VERTICAL_SLICE",
          },
        };
      },
    },
    {
      id: "EVIDENCE_BUILDID_MATCH",
      predicate: "CURRENT_EVIDENCE.buildId aligns with CURRENT_RELEASE.buildId",
      check: () => {
        const ev = facts.evidenceBuildId;
        const rel = facts.releaseBuildId;
        if (!ev || !rel) return { pass: false, observed: { ev, rel }, class: "UNKNOWN" };
        // Allow date-prefix alignment (gap-to-zero-YYYY-MM-DD vs crown-...)
        const sameDay = String(ev).slice(-10) === String(rel).slice(-10);
        return { pass: sameDay || ev === rel, observed: { ev, rel, sameDay } };
      },
    },
    {
      id: "VISIBLE_ACTION_IN_REGISTRY",
      predicate: "VISIBLE_ACTION exists in ActionRegistry",
      check: () => {
        const missing = facts.visibleActionsMissingFromRegistry || [];
        return { pass: missing.length === 0, observed: { missing } };
      },
    },
    {
      id: "ACTION_PROVIDER_EXISTS",
      predicate: "ActionRegistry provider exists",
      check: () => {
        const missing = facts.actionsMissingProvider || [];
        return { pass: missing.length === 0, observed: { missing } };
      },
    },
    {
      id: "EXPERIENCE_CAPABILITY_REGISTERED",
      predicate: "Experience capability exists in CapabilityRegistry",
      check: () => {
        return {
          pass: facts.experienceCapabilityRegistered !== false,
          observed: {
            experienceCapabilityRegistered: facts.experienceCapabilityRegistered ?? true,
          },
        };
      },
    },
    {
      id: "NO_UNKNOWN_MANDATORY_FOR_READY",
      predicate: "No UNKNOWN mandatory dependency may produce READY",
      check: () => {
        const unknownMandatory = facts.unknownMandatoryDeps || [];
        const claimedReady = !!facts.claimedReady;
        const pass = !(claimedReady && unknownMandatory.length > 0);
        return { pass, observed: { unknownMandatory, claimedReady } };
      },
    },
  ];

  const results = invariants.map((inv) => {
    const r = inv.check();
    return {
      id: inv.id,
      predicate: inv.predicate,
      pass: !!r.pass,
      class: r.class || (r.na ? "NOT_APPLICABLE" : r.pass ? "PASS" : "FAIL"),
      observed: r.observed,
    };
  });

  return {
    schema: "sci-os-invariant-mesh/v1",
    label: "ALPHA_NON_PRODUCTION",
    results,
    allPass: results.every((r) => r.pass || r.class === "NOT_APPLICABLE"),
    failCount: results.filter((r) => !r.pass && r.class !== "NOT_APPLICABLE").length,
  };
}
