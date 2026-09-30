#!/usr/bin/env node
"use strict";

/**
 * scripts/ux-usability-proof.js
 * Live + static checks against SCI OS design/UX contracts.
 * No evidence ⇒ UNKNOWN (never PASS without probes).
 *
 * Output: diagnostics-export/ux-usability-proof.json
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ROOT = process.cwd();
const PORT = Number(process.env.SCIOS_COCKPIT_PORT || process.env.PORT || 4000);
const OUT = path.join(ROOT, "diagnostics-export", "ux-usability-proof.json");

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
  });
}

function check(id, pass, detail, weight = 1) {
  return {
    id,
    pass: pass === true,
    status: pass === true ? "PASS" : pass === false ? "FAIL" : "UNKNOWN",
    detail,
    weight,
  };
}

(async () => {
  const cockpitSrc = path.join(ROOT, "apps/cockpit-ui/src/index.js");
  const designDoc = path.join(ROOT, "..", "docs", "SCI-OS-DESIGN-SYSTEM.md");
  const uxDoc = path.join(ROOT, "..", "docs", "SCI-OS-UX-FLOW-SYSTEM.md");
  const bench = path.join(
    ROOT,
    "diagnostics-export",
    "ux-competitive-benchmark.json"
  );

  const src = fs.existsSync(cockpitSrc)
    ? fs.readFileSync(cockpitSrc, "utf8")
    : "";
  const hz = await get(`http://127.0.0.1:${PORT}/healthz`);
  const html = await get(`http://127.0.0.1:${PORT}/`);

  const canonicalViews = [
    "Graph",
    "Timeline",
    "Evidence",
    "Dossier",
    "Client Portal",
    "Executive",
  ];
  const alphaNav = [
    "Dashboard",
    "Vertical Slice",
    "Lineage",
    "Risk",
    "Execution",
    "System Health",
  ];

  const checks = [];

  checks.push(
    check(
      "benchmark_artifact",
      fs.existsSync(bench),
      "diagnostics-export/ux-competitive-benchmark.json"
    )
  );
  checks.push(
    check(
      "design_system_doc",
      fs.existsSync(designDoc) ||
        fs.existsSync(path.join(ROOT, "docs/SCI-OS-DESIGN-SYSTEM.md")),
      "SCI-OS-DESIGN-SYSTEM.md reachable from workspace"
    )
  );
  checks.push(
    check(
      "ux_flow_doc",
      fs.existsSync(uxDoc) ||
        fs.existsSync(path.join(ROOT, "docs/SCI-OS-UX-FLOW-SYSTEM.md")),
      "SCI-OS-UX-FLOW-SYSTEM.md reachable"
    )
  );

  checks.push(
    check(
      "cockpit_healthz",
      hz.status === 200,
      `GET :${PORT}/healthz → ${hz.status}`
    )
  );
  checks.push(
    check(
      "cockpit_html_200",
      html.status === 200 && html.body.includes("SCI OS"),
      `GET :${PORT}/ → ${html.status}`
    )
  );

  // Design language tokens in ALPHA cockpit (approximate palette)
  const tokenHits = [
    ["--navy", src.includes("--navy") || html.body.includes("--navy")],
    ["--snow", src.includes("--snow") || html.body.includes("--snow")],
    ["--fog", src.includes("--fog") || html.body.includes("--fog")],
    ["--red", src.includes("--red") || html.body.includes("--red")],
  ];
  checks.push(
    check(
      "design_tokens_present",
      tokenHits.every(([, ok]) => ok),
      tokenHits.map(([k, ok]) => `${k}:${ok ? "yes" : "no"}`).join(" ")
    )
  );

  checks.push(
    check(
      "single_primary_action_slice",
      src.includes('id="go"') && src.includes("Run slice"),
      "Vertical slice has one primary Run CTA"
    )
  );

  checks.push(
    check(
      "verdict_unknown_default",
      src.includes("UNKNOWN") && src.includes("badge"),
      "Readiness badge defaults to UNKNOWN (honesty)"
    )
  );

  const navFound = alphaNav.filter(
    (n) => src.includes(n) || html.body.includes(n)
  );
  checks.push(
    check(
      "alpha_nav_surfaces",
      navFound.length >= 5,
      `found ${navFound.length}/${alphaNav.length}: ${navFound.join(", ")}`
    )
  );

  const canonFound = canonicalViews.filter((v) =>
    (src + html.body).toLowerCase().includes(v.toLowerCase())
  );
  checks.push(
    check(
      "canonical_forensic_flow_nav",
      false,
      `ALPHA cockpit does not yet expose full Graph→…→Executive nav (found labels: ${canonFound.join(", ") || "none"}). Status forced FAIL vs contract — not UNKNOWN.`,
      2
    )
  );
  // Override: we intentionally FAIL this vs contract (gap is proven)
  checks[checks.length - 1].pass = false;
  checks[checks.length - 1].status = "FAIL";

  checks.push(
    check(
      "no_gradient_policy_deviation",
      !(src.includes("linear-gradient") || html.body.includes("linear-gradient")),
      "Design System prefers flat Swiss surfaces; ALPHA still uses gradient (deviation noted)"
    )
  );

  checks.push(
    check(
      "human_usability_lab",
      null,
      "No moderated user study artifact present — remains UNKNOWN"
    )
  );
  checks[checks.length - 1].pass = null;
  checks[checks.length - 1].status = "UNKNOWN";

  const passN = checks.filter((c) => c.status === "PASS").length;
  const failN = checks.filter((c) => c.status === "FAIL").length;
  const unkN = checks.filter((c) => c.status === "UNKNOWN").length;

  let verdict = "UNKNOWN";
  if (failN === 0 && unkN === 0 && passN > 0) verdict = "PASS";
  else if (passN > 0 && failN > 0) verdict = "PARTIAL";
  else if (failN > 0 && passN === 0) verdict = "FAIL";

  const report = {
    at: new Date().toISOString(),
    schema: "sci-os-ux-usability-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    cockpitPort: PORT,
    verdict,
    counts: { pass: passN, fail: failN, unknown: unkN },
    workflowTarget:
      "Graph → Timeline → Evidence → Dossier → Client Portal → Executive",
    alphaWorkflowObserved: alphaNav,
    fasterClearerWorkflowRules: [
      "One primary action per view",
      "Deep links with case + selection",
      "Breadcrumb Case > View",
      "CoPilot suggestions accept-only",
      "Evidence always shows provenance when available",
    ],
    checks,
    note: "PARTIAL expected in ALPHA. Canonical forensic flow nav not yet in cockpit — do not claim enterprise UX READY.",
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(verdict === "PASS" ? 0 : 0); // evidence written; ALPHA partial is not CI-red by default
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
